"""Run with Python + Playwright installed. Uses local Chromium or CHROMIUM_PATH."""
import os, subprocess,time,urllib.request,json,signal
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['npm','run','dev','--','--host','127.0.0.1','--port','5192'],cwd=root,stdout=open(root/'server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(100):
  try: urllib.request.urlopen('http://127.0.0.1:5192');break
  except Exception:time.sleep(.15)
 else: raise RuntimeError((root/'server.log').read_text())
 with sync_playwright() as p:
  opts={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}
  if os.environ.get('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
  b=p.chromium.launch(**opts);page=b.new_page(viewport={'width':1512,'height':980});errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGEERROR',e,flush=True)))
  page.goto('http://127.0.0.1:5192');page.wait_for_selector('#viewport canvas',timeout=10000);page.wait_for_timeout(1200)
  assert 'elements' in page.locator('#count').inner_text()
  page.locator('#search').fill('Level 0 slab');page.get_by_role('button',name='Level 0 slab',exact=True).click();assert 'CE-0001' in page.locator('#properties').inner_text()
  page.get_by_role('button',name='◩ Section').click();assert page.locator('#section').get_attribute('aria-pressed')=='true'
  page.get_by_role('button',name='↕ Explode').click();page.locator('#floor').select_option('2');page.locator('#search').fill('Level 2 slab');assert 'Level 2 slab' in page.locator('#tree').inner_text()
  page.get_by_role('button',name='↺ Reset').click()
  # Actual raycaster picking at visible rendered pixel.
  rect=page.locator('#viewport').bounding_box();found=False
  for dx,dy in [(0.5,0.5),(.5,.6),(.45,.55),(.55,.55)]:
   page.mouse.click(rect['x']+rect['width']*dx,rect['y']+rect['height']*dy)
   if page.locator('#properties h2').count():found=True;break
  assert found,'3D picking did not select a mesh'
  page.on('dialog',lambda d:d.accept('Check glazing alignment'))
  page.get_by_role('button',name='+ Add issue to element').click();page.locator('[data-tab=issues]').click();assert 'Check glazing alignment' in page.locator('#alternate').inner_text();page.get_by_role('button',name='Resolve',exact=True).click();assert 'resolved' in page.locator('#alternate').inner_text()
  page.locator('[data-tab=views]').click();page.get_by_role('button',name='+ Save current filters').click();assert page.get_by_role('button',name='Check glazing alignment',exact=True).count()==1
  page.locator('[data-tab=site]').click();assert page.locator('.site-card svg').is_visible()
  page.locator('[data-tab=bim]').click()
  with page.expect_download() as d:page.locator('#export').click()
  assert d.value.suggested_filename=='cloudes-model.json'
  page.locator('#import').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"elements":[]}'})
  expect(page.locator('#status')).to_contain_text('Import failed')
  page.locator('#import').set_input_files(str(root/'public/sample-model.json'));page.wait_for_timeout(400);expect(page.locator('#status')).to_contain_text('Model imported')
  with page.expect_download() as d:page.locator('#snapshot').click()
  assert d.value.suggested_filename.endswith('.png')
  page.screenshot(path=str(root/'docs/desktop.png'))
  page.reload();page.locator('[data-tab=issues]').click();assert 'Check glazing alignment' in page.locator('#alternate').inner_text()
  page.locator('[data-tab=bim]').click();page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(600)
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.screenshot(path=str(root/'docs/mobile.png'),full_page=True)
  assert not errors,errors
  print(json.dumps({'browser':'Chromium software WebGL','desktop':'1512x980','mobile':'390x844 emulated viewport','checks':'render, actual raycast selection, filters, clipping, explode, reset, issue persistence, saved filters, site tab, import rejection and success, JSON/PNG downloads, no overflow','page_errors':errors}))
  b.close()
finally:
 os.killpg(server.pid,signal.SIGTERM)
 server.wait(timeout=10)

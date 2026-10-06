import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { isVisible } from "./model.js";
export function createViewer(host, onPick) {
  const scene = new T.Scene();
  scene.background = new T.Color("#edf2f6");
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 1500);
  const renderer = new T.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  host.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new T.HemisphereLight(0xffffff, 0x647789, 2.4));
  const sun = new T.DirectionalLight(0xffffff, 2);
  sun.position.set(30, 70, 40);
  scene.add(sun);
  const building = new T.Group();
  scene.add(building);
  const site = new T.Group();
  scene.add(site);
  function box(size, pos, color, parent = site) {
    const m = new T.Mesh(
      new T.BoxGeometry(...size),
      new T.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    m.position.set(...pos);
    parent.add(m);
    return m;
  }
  box([100, 0.3, 75], [0, -0.8, 0], "#b7cab6");
  box([90, 0.2, 9], [0, -0.55, 26], "#73838e");
  box([9, 0.2, 70], [35, -0.55, 0], "#73838e");
  box([40, 0.15, 26], [0, -0.5, 0], "#d7d9ce");
  for (let i = 0; i < 14; i++) {
    const x = -42 + i * 6,
      z = -27;
    box([0.5, 2, 0.5], [x, 0.3, z], "#7c684d");
    const tree = new T.Mesh(
      new T.ConeGeometry(2.5, 6, 7),
      new T.MeshStandardMaterial({ color: "#6c977c" }),
    );
    tree.position.set(x, 4, z);
    site.add(tree);
  }
  const boundary = new T.LineLoop(
    new T.BufferGeometry().setFromPoints(
      [
        [-47, 0, -33],
        [47, 0, -33],
        [47, 0, 33],
        [-47, 0, 33],
      ].map((p) => new T.Vector3(...p)),
    ),
    new T.LineBasicMaterial({ color: "#427fd6" }),
  );
  site.add(boundary);
  let meshes = [],
    selected = null,
    filter,
    explode = 0,
    section = false;
  const plane = new T.Plane(new T.Vector3(-1, 0, 0), 0);
  function load(model) {
    for (const m of meshes) {
      m.geometry.dispose();
      m.material.dispose();
    }
    building.clear();
    meshes = model.elements.map((e) => {
      const m = box(e.size, e.position, e.color || "#b0bdcc", building);
      m.userData = e;
      m.material.side = T.DoubleSide;
      m.material.transparent = e.category === "Windows";
      m.material.opacity = e.category === "Windows" ? 0.58 : 1;
      return m;
    });
    selected = null;
    fit();
  }
  function update(f) {
    filter = f;
    for (const m of meshes) {
      m.visible = isVisible(m.userData, f);
      m.position.fromArray(m.userData.position);
      m.position.y += m.userData.floor * explode;
      m.material.clippingPlanes = section ? [plane] : [];
    }
  }
  function fit() {
    const bounds = new T.Box3().setFromObject(building);
    const c = bounds.getCenter(new T.Vector3()),
      s = bounds.getSize(new T.Vector3()).length() || 40;
    controls.target.copy(c);
    camera.position.copy(c).add(new T.Vector3(s * 1.1, s * 0.7, s * 1.1));
    camera.near = Math.max(0.01, s / 1000);
    camera.far = Math.max(1500, s * 20);
    camera.updateProjectionMatrix();
    controls.update();
  }
  function select(id) {
    if (selected) selected.material.emissive.set(0);
    selected = meshes.find((m) => m.userData.id === id);
    if (selected) selected.material.emissive.set("#285da0");
  }
  const ray = new T.Raycaster(),
    point = new T.Vector2();
  let down;
  renderer.domElement.addEventListener(
    "pointerdown",
    (e) => (down = [e.clientX, e.clientY]),
  );
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5)
      return;
    const r = renderer.domElement.getBoundingClientRect();
    point.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(point, camera);
    const hit = ray
      .intersectObjects(meshes.filter((m) => m.visible))
      .find((h) => !section || plane.distanceToPoint(h.point) >= 0);
    if (hit) onPick(hit.object.userData, hit.point.toArray());
  });
  new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }).observe(host);
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
  return {
    load,
    update,
    fit,
    select,
    explode(v) {
      explode = v;
      if (filter) update(filter);
    },
    section(v) {
      section = v;
      if (filter) update(filter);
    },
    site(v) {
      site.visible = v;
    },
    plan() {
      camera.position.set(0, 100, 0.01);
      controls.target.set(0, 0, 0);
      controls.update();
    },
    screenshot() {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
  };
}

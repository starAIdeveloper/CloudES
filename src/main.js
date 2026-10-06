import "./style.css";
import { sampleModel, validateModel, geo, distance } from "./model.js";
import { createViewer } from "./viewer.js";
const $ = (s) => document.querySelector(s);
let model = sampleModel(),
  selected,
  measure = false,
  points = [];
const filters = { categories: new Set(), floor: "all", hidden: new Set() };
let viewer;
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
let issues = read("cloudes-issues", []),
  views = read("cloudes-views", []);
if (!Array.isArray(issues)) issues = [];
if (!Array.isArray(views)) views = [];
$("#app").innerHTML =
  `<aside class="rail"><a class="brand" href="#">C<span>CloudES</span></a><div class="rail-label">WORKSPACE</div><div class="nav active">▦ <span>Project viewer</span></div><div class="rail-bottom">CE<span>Concept edition<br>Local workspace</span></div></aside><div class="shell"><header><div><small>PROJECTS / RIVERSIDE CAMPUS</small><h1>Construction workspace</h1></div><div class="header-actions"><label class="import">↑ Import JSON<input id="import" type="file" accept=".json,application/json"></label><button id="export">Export model</button><div class="avatar">CE</div></div></header><div class="project"><div><span class="project-icon">▥</span><strong id="model-name"></strong><span class="badge">CONCEPT MODEL</span></div><span id="count"></span></div><nav class="tabs"><button class="active" data-tab="bim">BIM viewer</button><button data-tab="site">Site plan</button><button data-tab="issues">Issues <span id="issue-count">0</span></button><button data-tab="views">Saved views</button></nav><main><aside class="tree panel"><div class="panel-title">Model explorer <span>⌘</span></div><input id="search" placeholder="Search elements…" aria-label="Search elements"><label class="field">Storey<select id="floor"></select></label><div id="layers"></div><div id="tree"></div><div class="tree-footer">Units: metres · sample geometry</div></aside><section class="center"><div class="viewer-heading"><div><strong id="view-title">Architectural coordination</strong><small>Riverside campus · Brisbane, AU</small></div><span class="live">● LOCAL MODEL</span></div><div id="viewport"><div class="viewport-label">3D / PERSPECTIVE</div><div class="compass">N ↑</div></div><div id="alternate" hidden></div><div class="toolbar"><button id="fit">⊞ Fit</button><button id="plan">▧ Top</button><button id="section" aria-pressed="false">◩ Section</button><button id="explode" aria-pressed="false">↕ Explode</button><button id="measure" aria-pressed="false">↔ Measure</button><button id="hide">◌ Hide</button><button id="reset">↺ Reset</button><button id="snapshot">↓ PNG</button></div><div class="status" id="status" role="status">Drag to orbit · scroll to zoom · click an element to inspect</div></section><aside class="inspector panel"><div class="panel-title">Element properties</div><div id="properties"><div class="empty">▥<h3>Explore your building</h3><p>Select an element in the model or tree to inspect its geometry and material.</p></div></div><div class="inspector-bottom"><strong>Project coordinates</strong><p>27.4698° S · 153.0251° E</p><small>Illustrative local origin, not survey control</small></div></aside></main></div>`;
$("#model-name").textContent = model.name;
const status = (t) => ($("#status").textContent = t);
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    status("Browser storage unavailable. Export your notes before leaving.");
  }
}
function download(name, data, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function refresh() {
  viewer.update(filters);
  $("#count").textContent =
    `${model.elements.length} elements · ${new Set(model.elements.map((e) => e.floor)).size} levels`;
  const q = $("#search").value.toLowerCase();
  const root = $("#tree");
  root.replaceChildren();
  for (const cat of filters.categories) {
    const list = model.elements.filter(
      (e) =>
        e.category === cat &&
        (filters.floor === "all" || e.floor === +filters.floor) &&
        `${e.name} ${e.id}`.toLowerCase().includes(q),
    );
    if (!list.length) continue;
    const group = document.createElement("details");
    group.open = Boolean(q);
    const title = document.createElement("summary");
    title.textContent = `${cat} (${list.length})`;
    group.append(title);
    for (const e of list) {
      const b = document.createElement("button");
      b.className = "element" + (selected?.id === e.id ? " selected" : "");
      b.textContent = e.name;
      b.title = e.id;
      b.onclick = () => pick(e);
      group.append(b);
    }
    root.append(group);
  }
}
function setup() {
  filters.categories = new Set(model.elements.map((e) => e.category));
  filters.floor = "all";
  filters.hidden.clear();
  selected = null;
  $("#properties").innerHTML =
    '<div class="empty">▥<h3>Explore your building</h3><p>Select an element in the model or tree to inspect its geometry and material.</p></div>';
  $("#floor").replaceChildren();
  for (const v of [
    "all",
    ...new Set(model.elements.map((e) => e.floor).sort((a, b) => a - b)),
  ]) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v === "all" ? "All storeys" : `Level ${v}`;
    $("#floor").append(o);
  }
  $("#layers").replaceChildren();
  for (const cat of filters.categories) {
    const label = document.createElement("label");
    label.className = "layer";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    input.onchange = () => {
      input.checked
        ? filters.categories.add(cat)
        : filters.categories.delete(cat);
      refresh();
    };
    label.append(input, document.createTextNode(cat));
    $("#layers").append(label);
  }
  $("#model-name").textContent = model.name || "Imported model";
  viewer.load(model);
  refresh();
}
function pick(e, p) {
  selected = e;
  viewer.select(e.id);
  const props = $("#properties");
  props.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = e.name;
  props.append(title);
  const g = geo(e.position[0], e.position[2]);
  const data = {
    ID: e.id,
    Category: e.category,
    Storey: `Level ${e.floor}`,
    Material: e.material || "Unspecified",
    "Dimensions (m)": e.size.map((n) => n.toFixed(2)).join(" × "),
    "Box volume (m³)": e.size.reduce((a, b) => a * b, 1).toFixed(3),
    "Local XYZ (m)": e.position.join(", "),
    "Latitude (approx)": g.latitude.toFixed(6),
    "Longitude (approx)": g.longitude.toFixed(6),
  };
  for (const [k, v] of Object.entries(data)) {
    const row = document.createElement("div");
    row.className = "prop";
    const key = document.createElement("span"),
      value = document.createElement("strong");
    key.textContent = k;
    value.textContent = v;
    row.append(key, value);
    props.append(row);
  }
  const b = document.createElement("button");
  b.textContent = "+ Add issue to element";
  b.onclick = () => {
    const text = prompt("Issue description");
    if (!text?.trim()) return;
    issues.push({
      id: Date.now(),
      element: e.id,
      text: text.trim(),
      state: "open",
      created: new Date().toISOString(),
    });
    save("cloudes-issues", issues);
    $("#issue-count").textContent = issues.length;
    status("Issue saved locally.");
  };
  props.append(b);
  refresh();
  if (measure && p) {
    points.push(p);
    if (points.length === 2) {
      status(
        `3D point distance: ${distance(...points).toFixed(3)} m (current exploded geometry)`,
      );
      points = [];
    } else status("First point selected. Click a second surface.");
  }
}
try {
  viewer = createViewer($("#viewport"), pick);
  setup();
} catch (e) {
  status(`Unable to start 3D viewer: ${e.message}. WebGL 2 is required.`);
  throw e;
}
$("#floor").onchange = (e) => {
  filters.floor = e.target.value;
  refresh();
};
$("#search").oninput = refresh;
$("#fit").onclick = () => viewer.fit();
$("#plan").onclick = () => viewer.plan();
for (const id of ["section", "explode"])
  $("#" + id).onclick = (e) => {
    const b = e.currentTarget,
      v = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", v);
    viewer[id](id === "explode" ? (v ? 1.6 : 0) : v);
  };
$("#measure").onclick = (e) => {
  measure = !measure;
  points = [];
  e.currentTarget.setAttribute("aria-pressed", measure);
  status(
    measure
      ? "Click two visible surfaces to measure."
      : "Measurement disabled.",
  );
};
$("#hide").onclick = () => {
  if (!selected) return status("Select an element first.");
  filters.hidden.add(selected.id);
  refresh();
  status("Element hidden. Reset restores it.");
};
$("#reset").onclick = () => {
  for (const id of ["section", "explode", "measure"])
    $("#" + id).setAttribute("aria-pressed", "false");
  measure = false;
  points = [];
  viewer.explode(0);
  viewer.section(false);
  $("#search").value = "";
  setup();
  status("Model restored.");
};
$("#snapshot").onclick = () => {
  const a = document.createElement("a");
  a.href = viewer.screenshot();
  a.download = "cloudes-view.png";
  a.click();
};
$("#export").onclick = () =>
  download("cloudes-model.json", JSON.stringify(model, null, 2));
$("#import").onchange = async (e) => {
  const f = e.target.files[0];
  try {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) throw Error("Maximum file size: 5 MB.");
    const next = validateModel(JSON.parse(await f.text()));
    model = next;
    setup();
    status("Model imported.");
  } catch (err) {
    status(`Import failed: ${err.message}`);
  } finally {
    e.target.value = "";
  }
};
function tab(name) {
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $("#viewport").hidden = name !== "bim";
  $("#alternate").hidden = name === "bim";
  $(".toolbar").hidden = name !== "bim";
  const alt = $("#alternate");
  alt.replaceChildren();
  if (name === "site") {
    alt.innerHTML = `<div class="site-card"><small>LOCAL SITE PLAN / METRES</small><h2>Riverside campus</h2><svg viewBox="0 0 600 420" role="img" aria-label="Illustrative site plan with office building, access road and parcel boundary"><rect width="600" height="420" fill="#e5ecdf"/><path d="M0 325H600M490 0V420" stroke="#9daab3" stroke-width="42"/><rect x="65" y="40" width="470" height="330" fill="none" stroke="#4787d8" stroke-width="3" stroke-dasharray="8 6"/><rect x="180" y="120" width="180" height="108" rx="4" fill="#456d91"/><text x="195" y="170" fill="white" font-size="16">Office building</text><path d="M430 75V40l-8 12m8-12 8 12" stroke="#243b50" stroke-width="3"/><text x="425" y="95">N</text><path d="M70 290H170" stroke="#243b50" stroke-width="3"/><text x="90" y="280">20 m</text></svg><p>Illustrative Brisbane origin. Diagram reflects the bundled sample footprint, not imported models or a cadastral survey.</p><label><input id="site-layer" type="checkbox" checked> Show context in 3D</label></div>`;
    $("#site-layer").checked = siteVisible;
    $("#site-layer").onchange = (e) => {
      siteVisible = e.target.checked;
      viewer.site(siteVisible);
    };
  }
  if (name === "issues") {
    const h = document.createElement("h2");
    h.textContent = "Coordination issues";
    alt.append(h);
    const exp = document.createElement("button");
    exp.textContent = "Export issues";
    exp.onclick = () =>
      download("cloudes-issues.json", JSON.stringify(issues, null, 2));
    alt.append(exp);
    if (!issues.length) {
      const p = document.createElement("p");
      p.textContent = "Select an element and add an issue from its properties.";
      alt.append(p);
    }
    issues.forEach((i) => {
      const row = document.createElement("div");
      row.className = "issue";
      const text = document.createElement("p");
      text.textContent = `${i.element} · ${i.text}`;
      const b = document.createElement("button");
      b.textContent = i.state === "open" ? "Resolve" : "Reopen";
      b.onclick = () => {
        i.state = i.state === "open" ? "resolved" : "open";
        save("cloudes-issues", issues);
        tab("issues");
      };
      const state = document.createElement("small");
      state.textContent = i.state;
      row.append(text, state, b);
      alt.append(row);
    });
  }
  if (name === "views") {
    const h = document.createElement("h2");
    h.textContent = "Saved filter views";
    alt.append(h);
    const add = document.createElement("button");
    add.textContent = "+ Save current filters";
    add.onclick = () => {
      const name = prompt("View name");
      if (!name?.trim()) return;
      views.push({
        name: name.trim(),
        floor: filters.floor,
        categories: [...filters.categories],
      });
      save("cloudes-views", views);
      tab("views");
    };
    alt.append(add);
    views.forEach((v, i) => {
      const row = document.createElement("div");
      row.className = "issue";
      const b = document.createElement("button");
      b.textContent = v.name;
      b.onclick = () => {
        const available = new Set(model.elements.map((e) => e.category));
        filters.categories = new Set(
          v.categories.filter((c) => available.has(c)),
        );
        filters.floor = [...$("#floor").options].some(
          (o) => o.value === v.floor,
        )
          ? v.floor
          : "all";
        $("#floor").value = filters.floor;
        document
          .querySelectorAll(".layer")
          .forEach(
            (l) =>
              (l.firstChild.checked = filters.categories.has(l.textContent)),
          );
        refresh();
        tab("bim");
      };
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = () => {
        views.splice(i, 1);
        save("cloudes-views", views);
        tab("views");
      };
      row.append(b, del);
      alt.append(row);
    });
  }
}
let siteVisible = true;
document
  .querySelectorAll("[data-tab]")
  .forEach((b) => (b.onclick = () => tab(b.dataset.tab)));
$("#issue-count").textContent = issues.length;

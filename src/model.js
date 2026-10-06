export const origin = { latitude: -27.4698, longitude: 153.0251 };
export function geo(x, z) {
  return {
    latitude: origin.latitude - z / 111320,
    longitude:
      origin.longitude +
      x / (111320 * Math.cos((origin.latitude * Math.PI) / 180)),
  };
}
export function validateModel(data) {
  if (
    !data ||
    !Array.isArray(data.elements) ||
    data.elements.length < 1 ||
    data.elements.length > 5000
  )
    throw Error("Provide 1 to 5000 elements.");
  const ids = new Set();
  for (const e of data.elements) {
    if (
      typeof e.id !== "string" ||
      ids.has(e.id) ||
      typeof e.name !== "string" ||
      typeof e.category !== "string" ||
      !Number.isInteger(e.floor) ||
      e.floor < 0 ||
      e.floor > 100
    )
      throw Error(
        "Elements need unique IDs, names, categories and floors (0 to 100).",
      );
    ids.add(e.id);
    for (const k of ["size", "position"])
      if (
        !Array.isArray(e[k]) ||
        e[k].length !== 3 ||
        !e[k].every((n) => Number.isFinite(n) && Math.abs(n) <= 10000)
      )
        throw Error("Invalid geometry.");
    if (e.size.some((n) => n <= 0)) throw Error("Dimensions must be positive.");
    if (e.color && !/^#[a-f\d]{6}$/i.test(e.color))
      throw Error("Use hexadecimal colors.");
  }
  return data;
}
export function sampleModel() {
  const elements = [];
  let n = 0;
  const box = (name, category, floor, size, position, color, material) =>
    elements.push({
      id: `CE-${String(++n).padStart(4, "0")}`,
      name,
      category,
      floor,
      size,
      position,
      color,
      material,
    });
  for (let f = 0; f < 5; f++) {
    const y = f * 3.6;
    box(
      `Level ${f} slab`,
      "Slabs",
      f,
      [30, 0.28, 18],
      [0, y, 0],
      "#b8c3cc",
      "Reinforced concrete",
    );
    for (const x of [-13, -5, 5, 13])
      for (const z of [-7, 0, 7])
        box(
          `Column ${f}/${x}/${z}`,
          "Columns",
          f,
          [0.55, 3.6, 0.55],
          [x, y + 1.8, z],
          "#e2e5e7",
          "Concrete",
        );
    for (let x = -12; x <= 12; x += 3) {
      for (const z of [-8.7, 8.7]) {
        box(
          `Facade panel ${f}/${x}/${z}`,
          "Windows",
          f,
          [2.75, 2.8, 0.12],
          [x, y + 1.85, z],
          "#82b8ca",
          "Low-E glazing",
        );
        box(
          `Mullion ${f}/${x}/${z}`,
          "Beams",
          f,
          [0.1, 3.3, 0.2],
          [x + 1.4, y + 1.8, z],
          "#425367",
          "Aluminium",
        );
      }
    }
    for (const x of [-14.8, 14.8])
      box(
        `End wall ${f}/${x}`,
        "Walls",
        f,
        [0.25, 3.2, 17.6],
        [x, y + 1.8, 0],
        "#d0d5db",
        "Precast concrete",
      );
    box(
      `Service core ${f}`,
      "Walls",
      f,
      [3.8, 3.4, 4.2],
      [0, y + 1.8, 0],
      "#9baaba",
      "Concrete",
    );
    for (let p = 0; p < 3; p++)
      box(
        `Service run ${f}/${p}`,
        "MEP",
        f,
        [23, 0.16, 0.16],
        [0, y + 3.15, -3 + p * 0.6],
        ["#f49b42", "#55bba6", "#5586e4"][p],
        ["Supply", "Return", "Electrical"][p],
      );
  }
  box(
    "Roof canopy",
    "Slabs",
    5,
    [31, 0.32, 19],
    [0, 18, 0],
    "#c8ced5",
    "Concrete",
  );
  return { name: "Riverside Office · Concept", elements };
}
export function isVisible(e, filters) {
  return (
    filters.categories.has(e.category) &&
    (filters.floor === "all" || e.floor === Number(filters.floor)) &&
    !filters.hidden.has(e.id)
  );
}
export function distance(a, b) {
  return Math.hypot(...a.map((n, i) => n - b[i]));
}

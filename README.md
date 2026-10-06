# CloudES

An original browser-based construction visualization workspace inspired by the supplied reference screenshots. Includes a procedural five-storey office building, 3D BIM-style explorer, property inspection, local site context and coordination notes. This project is not affiliated with the existing CloudES company or Esri.

## Run

Requires Node.js 22+ and a browser supporting WebGL 2.

```sh
npm ci
npm run dev
npm test
npm run build
```

Vite serves the workspace locally. `dist/` is the static production output. There are no credentials, external map services, analytics or backend requirements.

## Working features

- Orbit, zoom, top view and fit-to-model camera controls.
- Click actual 3D geometry or a model-tree element to inspect metadata.
- Storey and category filters, text search, element hiding and reset.
- World-space section plane at X = 0 and vertical floor explosion.
- Two surface-click XYZ distance measurement in metres. Explosion affects measured positions; turn explosion off for original geometry measurements.
- Site context visibility, schematic sample site plan and illustrative Brisbane local coordinates.
- Element-linked issue creation, resolution, JSON export and browser-local persistence.
- Named filter views saved locally. These store categories and floor, not camera or section state.
- Geometry JSON import/export and rendered PNG downloads.
- Responsive desktop and narrow-screen layout, with model panels below the viewer on mobile.

## Data import

`public/sample-model.json` is a complete importable example. Maximum 5 MB and 5000 elements. Each element uses a unique string `id`, string `name`, string `category`, integer `floor` (0 to 100), positive three-number `size`, and finite three-number `position`. Dimensions and positions are local XYZ metres with Y up. Geometry values must be within ±10000. Optional `color` is a six-digit hex value and `material` is a descriptive string.

This viewer accepts the documented JSON box geometry format. It does **not** parse IFC, Revit, DWG or glTF. Categories and metadata resemble BIM concepts but do not certify IFC semantics or quantity accuracy. Box volume is the bounding geometry volume, not a material takeoff. Site plan is a fixed illustration of the sample site, not an imported model drawing. Coordinate conversion is an approximate local tangent calculation, not surveyed georeferencing. No ArcGIS integration is represented.

## Quality checks

`npm test` checks sample geometry, rejected input, filter composition, point distance and coordinate direction. GitHub Actions repeats these tests, rendered-browser checks and the production build on pushes and PRs.

For actual rendered-browser checks:

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/browser_check.py
```

Set `CHROMIUM_PATH` to use an existing Chromium executable. The script starts its own local Vite server, exercises the UI and writes desktop/mobile PNG screenshots under `docs/`. See [validation](docs/validation.md) for the checks executed during implementation. A mobile viewport check is not a real-device test.

## Scope and next integrations

This is a standalone functional visualization foundation, not an enterprise construction SaaS backend. Accounts, authorization, shared databases, revision management, real geospatial services, clash detection, IFC ingestion and production deployment need separate implementation. Issues and views stay in this browser and origin; export before clearing storage. Do not use it as a safety, survey or engineering authority.

## Commit history

Implementation was committed as work progressed, using current timestamps. GitHub imports have their own object hashes; the accompanying `CloudES-history.bundle` preserves the original local commits. No history has been backdated or presented as past professional work.

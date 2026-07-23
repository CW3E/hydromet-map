# Projects

## What a project is

A project is a named map experience that selects:

- a layer family or no layer family
- available layer ids
- layer order in the toggle menu
- default visible layers
- optional default family overrides

Current project definitions live in [src/config/mapConfig.js](../src/config/mapConfig.js) under `PROJECTS`.

## Current projects

### `cnrfc`

Includes:

- `cnrfcRaster`
- `cnrfcRegion`
- `cnrfcRivers`
- `cnrfcStreamflow`
- `cnrfcBasins`
- `cnrfcPoints`
- `snowCourses`
- `snowPillows`

Default family variable:

- `soilMoistureDaily`

Current popup coverage:

- `cnrfcPoints` supports the forecast point popup
- `cnrfcStreamflow` supports the dedicated CNRFC streamflow popup
- `snowCourses` and `snowPillows` support the shared snow-station popup

### `b120`

Includes:

- `cnrfcRaster`
- `cnrfcRegion`
- `cnrfcRivers`
- `b120Basins`
- `b120Points`
- `snowCourses`
- `snowPillows`

Default family variable:

- `sweDaily`

This reflects the current design decision that the CNRFC raster domain is also useful as context for B120 users.

### `yampa`

Includes:

- `ucrbRaster`
- `ucrbRegion`
- `ucrbRivers`
- `yampaRegion`
- `yampaPoints`

Default family variable:

- `sweDaily`

This project uses the `ucrb` layer family but presents a Yampa-focused layer set and view.

### `global`

Includes:

- `gradesHydroDl`
- `meritBasins`
- `swordReaches`
- `camaFlood`
- `grit`
- `hydroRivers`
- `gsha`
- `geodar`

Layer family:

- none

This project is intended for large-domain hydrography exploration without a raster overlay.

Current popup coverage:

- `gradesHydroDl` and `swordReaches` support the shared global reach popup
- `meritBasins`, `camaFlood`, `grit`, `hydroRivers`, `gsha`, and `geodar` currently provide hover inspection only

Default map setup:

- basemap: `Terrain`
- terrain: enabled
- projection: `globe`

Known issue:

- on `Terrain` or `Satellite` basemaps, interacting with `GRADES-hydroDL` and `SWORD Reaches` can occasionally lead to drag freeze / popup-close glitches when terrain is switched off
- recommended workaround: keep terrain enabled in the `global` project, or switch to `Flat` / `mercator` if needed

## Definition vs state

The app intentionally separates project definition from project state.

### Definition

Definition is static configuration:

```js
{
  id,
  label,
  documentTitle,
  layerFamilyId,
  availableLayerIds,
  defaultVisibleLayerIds,
  defaultFamily,
  logoUrl,
  logoAlt,
  logoHref,
  about,
}
```

### State

State is user/runtime data:

```js
{
  view,
  basemapId,
  terrainEnabled,
  projection,
  layers,
  family,
}
```

This separation is what makes per-project memory practical.

## Layer ordering

Important detail:

Project layer order comes from `availableLayerIds`, not from the global layer registry.

That behavior is implemented in `getProjectMapLayers()` in [src/config/mapConfig.js](../src/config/mapConfig.js).

If you want to change the toggle order inside a project, change `availableLayerIds`.

## Per-project memory

The app keeps memory for each project in `projectStateById`.

So when a user switches from `cnrfc` to `b120` and back, the previous project's:

- layer visibility
- view extent
- basemap
- terrain
- projection
- family selector state

are preserved in memory.

## Project switching UI

The bottom project switch button opens a lightweight passcode dialog before rendering the project list. This is not security; it is only intended to keep casual visitors from easily discovering other project names through hover or accidental taps.

The passcode-gated switcher lives in:

- [src/components/map/ProjectSwitcherDialog.jsx](../src/components/map/ProjectSwitcherDialog.jsx)

The visible button and dialog mount point live in:

- [src/components/map/MapCanvas.jsx](../src/components/map/MapCanvas.jsx)

Do not reintroduce hover-open project menus. Project names should only be rendered after the switcher dialog is unlocked.

## Adding a new project

To add a new project:

1. Add a new entry to `PROJECTS` in [src/config/mapConfig.js](../src/config/mapConfig.js).
2. Set `layerFamilyId` to a layer family id or leave it unset/null for a no-family project.
3. Define `availableLayerIds` in the exact order you want in the toggle list.
4. Define `defaultVisibleLayerIds`.
5. Optionally define `defaultFamily` overrides.

Minimal example:

```js
myProject: {
  id: 'myProject',
  label: 'My Project',
  documentTitle: 'My Project Map',
  layerFamilyId: 'cnrfc',
  defaultFamily: {
    variable: 'precipitationDaily',
  },
  logoUrl: 'https://example.com/logo.png',
  logoAlt: 'Example organization logo',
  logoHref: 'https://example.com',
  about: {
    title: 'About My Project',
    markdownUrl: 'about/my-project.md',
  },
  availableLayerIds: [
    'cnrfcRaster',
    'cnrfcRegion',
    'snowPillows',
  ],
  defaultVisibleLayerIds: [
    'cnrfcRaster',
    'snowPillows',
  ],
}
```

## Optional branding

Projects can define light branding without changing map components:

- `documentTitle` sets the browser tab title while the project is active.
- `logoUrl` shows a project-specific logo in the lower-right corner of the map.
- `logoAlt` is used for accessibility and hover tooltip text.
- `logoHref` is optional; when set, clicking the logo opens that URL.

If `logoUrl` is omitted, no logo is shown.

## Optional about pages

Projects can also define an about page:

```js
about: {
  title: 'About My Project',
  markdownUrl: 'about/my-project.md',
}
```

When `about.markdownUrl` is set, the app shows an info button in the map controls. Clicking it opens a modal and renders the Markdown file with `react-markdown`.

Recommended location:

- `public/about/<project-id>.md`

Use about pages for project credits, source product links, map tool API providers, basemap providers, source code links, licenses, and project-specific caveats.

## Recommended conventions

- Treat a layer family change as a new project.
- Reuse layers across projects whenever possible.
- Keep project-specific differences in project config rather than duplicating layer modules.

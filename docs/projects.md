# Projects

## What a project is

A project is a named map experience that selects:

- a raster family or no raster family
- available layer ids
- layer order in the toggle menu
- default visible layers
- optional default raster overrides

Current project definitions live in [src/config/mapConfig.js](../src/config/mapConfig.js) under `PROJECTS`.

## Current projects

### `cnrfc`

Includes:

- `cnrfcRaster`
- `cnrfcRegion`
- `cnrfcRivers`
- `cnrfcBasins`
- `cnrfcPoints`
- `snowCourses`
- `snowPillows`

Default raster variable:

- `soilMoistureDaily`

### `b120`

Includes:

- `cnrfcRaster`
- `cnrfcRegion`
- `cnrfcRivers`
- `b120Basins`
- `b120Points`
- `snowCourses`
- `snowPillows`

Default raster variable:

- `sweDaily`

This reflects the current design decision that the CNRFC raster domain is also useful as context for B120 users.

### `yampa`

Includes:

- `ucrbRaster`
- `ucrbRegion`
- `ucrbRivers`
- `yampaRegion`
- `yampaPoints`

Default raster variable:

- `sweDaily`

This project uses the `ucrb` raster family but presents a Yampa-focused layer set and view.

### `global`

Includes:

- `gradesHydroDl`
- `meritBasins`
- `swordReaches`

Raster family:

- none

This project is intended for large-domain hydrography exploration without a raster overlay.

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
  rasterFamilyId,
  availableLayerIds,
  defaultVisibleLayerIds,
  defaultRaster,
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
  raster,
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
- raster selection

are preserved in memory.

## Adding a new project

To add a new project:

1. Add a new entry to `PROJECTS` in [src/config/mapConfig.js](../src/config/mapConfig.js).
2. Set `rasterFamilyId` to a raster family id or leave it unset/null for a no-raster project.
3. Define `availableLayerIds` in the exact order you want in the toggle list.
4. Define `defaultVisibleLayerIds`.
5. Optionally define `defaultRaster` overrides.

Minimal example:

```js
myProject: {
  id: 'myProject',
  label: 'My Project',
  rasterFamilyId: 'cnrfc',
  defaultRaster: {
    variable: 'precipitationDaily',
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

## Recommended conventions

- Treat a raster family change as a new project.
- Reuse layers across projects whenever possible.
- Keep project-specific differences in project config rather than duplicating layer modules.

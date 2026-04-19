# Adding a Layer

## Goal

This guide covers how to add a new reusable map layer to the app.

## Step 1: create the layer module

Add a new file under `src/layers/`.

Example:

```txt
src/layers/myNewLayer.jsx
```

Use the existing modules as references:

- [src/layers/b120PointsLayer.jsx](../src/layers/b120PointsLayer.jsx)
- [src/layers/cnrfcRiversLayer.jsx](../src/layers/cnrfcRiversLayer.jsx)
- [src/layers/cnrfcRasterLayer.jsx](../src/layers/cnrfcRasterLayer.jsx)

## Step 2: export the layer from the registry

Update [src/layers/index.js](../src/layers/index.js):

1. import the module
2. add it to `MAP_LAYER_MODULES`

This affects render order, so placement in that array matters.

## Step 3: register the layer id

Add an entry to `ALL_MAP_LAYERS` in [src/config/mapConfig.js](../src/config/mapConfig.js).

Define:

- `id`
- `label`
- `type`
- `description`
- `symbol`
- optional `symbolColor`

## Step 4: expose the layer in one or more projects

In `PROJECTS`, add the new layer id to:

- `availableLayerIds`
- optionally `defaultVisibleLayerIds`

This controls:

- whether the layer appears in a project
- where it appears in that project's toggle list
- whether it starts enabled

## Step 5: add popup support if needed

If the layer only needs a small hover popup, keep it in the layer module.

If the layer needs:

- remote CSV loading
- tabbed popup UI
- Plotly charts
- complex derived data

create a feature module under `src/features/` and call it from the layer's `handleClick` / `renderPopups`.

## Recommended layer module checklist

- define `id`
- add `isVisible`
- implement `renderLayers`
- add `getInteractiveLayerIds` if hover/click is needed
- add `getPointerState` and `getPointerLeaveState` for hover info
- add `handleClick` if clicking should open a popup
- add `renderPopups` if the layer shows hover or click popups

## Common patterns

### Point layer with hover and click

Good references:

- [src/layers/cnrfcPointsLayer.jsx](../src/layers/cnrfcPointsLayer.jsx)
- [src/layers/b120PointsLayer.jsx](../src/layers/b120PointsLayer.jsx)

### Polygon layer with hover-linked highlight

Good references:

- [src/layers/cnrfcBasinsLayer.jsx](../src/layers/cnrfcBasinsLayer.jsx)
- [src/layers/b120BasinsLayer.jsx](../src/layers/b120BasinsLayer.jsx)

### Raster overlay

Good reference:

- [src/layers/cnrfcRasterLayer.jsx](../src/layers/cnrfcRasterLayer.jsx)

## Naming recommendations

Prefer project/region-qualified ids when a layer is domain-specific.

Examples:

- `cnrfcPoints`
- `cnrfcBasins`
- `cnrfcRivers`
- `cnrfcRaster`
- `b120Points`
- `b120Basins`

This avoids ambiguity as the app grows.

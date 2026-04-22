# Layers

## Layer module pattern

Each layer lives in its own module under `src/layers/`.

Current registry:

- [src/layers/index.js](../src/layers/index.js)

Examples:

- [src/layers/cnrfcRasterLayer.jsx](../src/layers/cnrfcRasterLayer.jsx)
- [src/layers/ucrbRasterLayer.jsx](../src/layers/ucrbRasterLayer.jsx)
- [src/layers/cnrfcPointsLayer.jsx](../src/layers/cnrfcPointsLayer.jsx)
- [src/layers/yampaPointsLayer.jsx](../src/layers/yampaPointsLayer.jsx)
- [src/layers/cnrfcBasinsLayer.jsx](../src/layers/cnrfcBasinsLayer.jsx)
- [src/layers/b120PointsLayer.jsx](../src/layers/b120PointsLayer.jsx)
- [src/layers/gradesHydroDlLayer.jsx](../src/layers/gradesHydroDlLayer.jsx)
- [src/layers/swordReachesLayer.jsx](../src/layers/swordReachesLayer.jsx)

## Typical layer module shape

Layer modules are plain objects. Common fields:

```js
const myLayer = {
  id: 'layerId',
  stateKey: 'hoveredThing',
  isVisible(context) { ... },
  getInteractiveLayerIds(context) { ... },
  getPointerState(context) { ... },
  getPointerLeaveState(context) { ... },
  handleClick(context) { ... },
  renderLayers(context) { ... },
  renderPopups(context) { ... },
}
```

Not every layer uses every field.

## Responsibilities

### `id`

Must match the layer id used in project configuration.

Examples:

- `cnrfcRaster`
- `ucrbRaster`
- `cnrfcPoints`
- `cnrfcBasins`
- `b120Points`
- `b120Basins`
- `yampaPoints`

### `isVisible`

Determines whether the layer module is active for the current project state.

Common pattern:

```js
isVisible: ({ appState }) => appState.layers.myLayerId
```

### `getInteractiveLayerIds`

Returns MapLibre layer ids used for hover/click hit testing.

### `getPointerState`

Maps hovered feature data into app interaction state.

### `getPointerLeaveState`

Clears hover state when the pointer leaves the map or feature context.

### `handleClick`

Used by clickable layers to open popup state. Return `true` when the click was handled.

### `renderLayers`

Returns the React MapLibre `Source`/`Layer` tree.

### `renderPopups`

Returns hover info popups and/or feature popup components.

Most layers render both hover info and feature popups directly from the layer module.

The global hydrography layers are a small exception:

- `gradesHydroDl` and `swordReaches` still render hover popups from their layer modules
- the shared feature popup for both layers is rendered once from `MapCanvas.jsx`
- layer click handlers only populate `selectedStation`

## Current layer categories

### Raster overlay

- `cnrfcRaster`
- `ucrbRaster`

This is a PNG image overlay driven by raster family state.

### Shared CNRFC vector layers

- `cnrfcRegion`
- `cnrfcRivers`
- `cnrfcBasins`
- `cnrfcPoints`

### Shared UCRB/Yampa vector layers

- `ucrbRegion`
- `ucrbRivers`
- `yampaRegion`
- `yampaPoints`

### B120-specific vector layers

- `b120Points`
- `b120Basins`

### Shared observation layers

- `snowCourses`
- `snowPillows`

### Global hydrography layers

- `gradesHydroDl`
- `meritBasins`
- `swordReaches`
- `camaFlood`
- `grit`
- `hydroRivers`
- `gsha`
- `geodar`

Notes:

- `gsha` is a point-tile inspection layer with hover info and a station label layer that appears from zoom 10 upward.
- `geodar` is a symbol-based point-tile inspection layer that renders a `Δ` glyph with a dedicated font stack.

## Layer ordering

Two different orderings matter:

### Toggle order

Controlled by each project's `availableLayerIds`.

### Render order

Controlled by the order of modules in [src/layers/index.js](../src/layers/index.js).

The toggle order and render order are separate on purpose.

## Interaction state

`MapCanvas.jsx` maintains shared transient hover state in `interactionState`.

Each layer module can contribute parts of that state through:

- `getPointerState`
- `getPointerLeaveState`

This is what enables patterns like:

- hover point -> highlight basin
- hover river -> show river popup

## Temporary map-tool overlays

Not every visible thing on the map is a project layer.

The app now also supports temporary map-tool overlays that are rendered outside the layer registry:

- watershed polygons returned by the context-menu tool
- upstream river lines returned by the context-menu tool
- downstream flowpaths returned by the context-menu tool
- measurement preview/final lines

These are rendered by:

- [src/components/map/MapToolOverlays.jsx](../src/components/map/MapToolOverlays.jsx)

The state and API calls for these overlays are managed by:

- [src/components/map/useMapTools.js](../src/components/map/useMapTools.js)

This keeps the reusable project layer system separate from ad hoc map-tool outputs.

## Advice when adding a layer

- Keep the map styling and interaction logic in the layer module.
- Keep project membership and order in `mapConfig.js`.
- If a layer needs a complex popup, create a feature module under `src/features/`.

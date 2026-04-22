# Architecture

## Overview

The app is a React + MapLibre web map with a project-centered state model.

For a visual overview, see [Structure Diagrams](./structure-diagrams.md).

At a high level:

- `App.jsx` owns application state, bookmark state, and project switching.
- `mapConfig.js` defines reusable registries for basemaps, layers, raster families, and projects.
- `MapCanvas.jsx` is now the top-level map composition layer: it wires the map instance, visible layers, controls, shared popups, and map tools together.
- `useMapTools.js` owns context-menu tool state, tool API calls, measurement logic, and temporary map-tool overlays/dialog state.
- `MapToolOverlays.jsx` renders temporary tool outputs such as watershed polygons, upstream river lines, downstream flowpaths, and measurement lines.
- `MapToolDialogs.jsx` renders the shared modal/dialog workflow for map-tool results and downloads.
- Layer modules in `src/layers/` encapsulate map sources, styles, hover/click behavior, and popup entry points.
- Popup feature modules in `src/features/` encapsulate remote CSV loading, plot/table/map configs, and popup UIs.
- Shared export helpers in `src/lib/` handle popup CSV download behavior.
- Some shared popup features may be rendered once from `MapCanvas.jsx` when multiple layers feed the same popup state.

## Main concepts

### Project

A project is the top-level map context.

A project defines:

- which layers are available
- the order of those layers in the toggle UI
- which layers are visible by default
- which raster family is used, if any
- optional default raster overrides

Current definitions live in [src/config/mapConfig.js](../src/config/mapConfig.js).

### Project state

Runtime state is stored per project.

The current model is:

```js
{
  activeProjectId,
  projectStateById: {
    [projectId]: {
      view,
      basemapId,
      terrainEnabled,
      projection,
      layers,
      raster,
    }
  }
}
```

This lets users switch projects without losing their previous project-specific settings.

### Layer

A layer is a reusable map module registered in:

- [src/layers/index.js](../src/layers/index.js)

Projects choose which layer ids to expose. The actual implementation lives once in `src/layers/`.

### Raster family

A raster family groups:

- raster variables
- product list
- ensemble list
- default date/datetime values
- per-variable PNG URL builders and palettes

The current app has two raster families:

- `cnrfc`
- `ucrb`

But the structure now supports multiple families, with the rule that each project may reference at most one raster family.

## Important files

### App and state

- [src/App.jsx](../src/App.jsx)
- [src/lib/appState.js](../src/lib/appState.js)
- [src/config/mapConfig.js](../src/config/mapConfig.js)

### Map shell

- [src/components/map/MapCanvas.jsx](../src/components/map/MapCanvas.jsx)
- [src/components/map/useMapTools.js](../src/components/map/useMapTools.js)
- [src/components/map/MapToolOverlays.jsx](../src/components/map/MapToolOverlays.jsx)
- [src/components/map/MapToolDialogs.jsx](../src/components/map/MapToolDialogs.jsx)
- [src/components/map/MapContextMenu.jsx](../src/components/map/MapContextMenu.jsx)
- [src/components/map/MapHud.jsx](../src/components/map/MapHud.jsx)
- [src/components/map/MapLegend.jsx](../src/components/map/MapLegend.jsx)
- [src/components/map/BookmarkControl.jsx](../src/components/map/BookmarkControl.jsx)
- [src/components/map/GlobeProjectionControl.jsx](../src/components/map/GlobeProjectionControl.jsx)

### Layer registry

- [src/layers/index.js](../src/layers/index.js)

### Popup features

- `src/features/cnrfcPointPopup/`
- `src/features/snowStationPopup/`
- `src/features/b120PointPopup/`
- `src/features/yampaPointPopup/`
- `src/features/globalReachPopup/`

### Shared export utilities

- [src/lib/csvExport.js](../src/lib/csvExport.js)
- [src/components/PopupCsvDownloadButton.jsx](../src/components/PopupCsvDownloadButton.jsx)

## Data flow

### Render flow

1. `App.jsx` reads URL state and builds the active project state.
2. `App.jsx` derives the active project definition, active raster family, and selected raster variable.
3. `MapCanvas.jsx` receives only the active project's runtime state.
4. `MapCanvas.jsx` filters layer modules against the active project's `availableLayerIds`.
5. Each visible layer module renders sources/layers and optional popup content.
6. `MapCanvas.jsx` may also render shared popup components that are driven by `selectedStation`.
7. `useMapTools.js` manages right-click/long-press map tools and temporary tool results.
8. `MapToolOverlays.jsx` renders temporary tool outputs inside the main map.
9. `MapToolDialogs.jsx` renders tool result dialogs outside the map canvas tree.
10. `MapHud.jsx` renders only the controls relevant to the active project's raster family and layers.

### Interaction flow

- pointer move:
  layer modules compute hover state through `getPointerState`
- click:
  visible layer modules may handle clicks through `handleClick`
- popup:
  selected feature state is stored in `selectedStation` and rendered by popup modules
- context menu:
  `useMapTools.js` listens to desktop right-click and mobile long-press to open a shared map action menu
- map tools:
  tool API responses are stored as temporary overlay state and rendered through `MapToolOverlays.jsx`
- tool dialogs:
  successful tool fetches can be downloaded as GeoJSON and optionally added to the map as temporary layers

For popup CSV export:

- popup data builders attach download-ready file metadata to each plot state
- popup components aggregate exportable files from the active tab
- the shared header download button triggers one or more CSV downloads

For the global hydrography layers, `selectedStation` is populated by the layer click handlers and the shared `GlobalReachPopup` is rendered once from `MapCanvas.jsx`.

## Map tools

The app now has a shared context-menu-driven map tool system.

Current tools:

- `Watershed to here`
- `Upstream rivers`
- `Downstream flowpath`
- `All 3 above!`
- `Measure distance`
- `Clear all temporary`

Current behavior:

- tool outputs are temporary and are not part of the project layer registry
- watershed results render as blue polygon fill + outline
- upstream rivers render as blue lines
- downstream flowpath renders as a thicker red line
- the combined tool can fetch all three outputs from the same clicked coordinate and add them together
- the measurement tool stores a start point, previews a live line to the current pointer, and labels both preview and final lines directly on the map
- tool dialogs can download returned GeoJSON before or instead of adding it to the map

These map tools intentionally live outside the layer module system because they are map-driven actions rather than reusable project layers.

## Design rules in the current app

- Projects may include zero or one raster family.
- Layers are globally reusable, but each project controls availability and order.
- Raster variables/products shown in the HUD always come from the active project's raster family.
- Bookmarks encode the active project and that project's visible state.
- CSV export is configured per plot, not per popup family globally.

## Extension strategy

If you add new functionality, prefer extending one of these existing seams:

- add a new reusable layer module
- add a new raster family
- add a new project definition
- add a new popup feature module

Avoid pushing unrelated logic into `App.jsx` or `MapCanvas.jsx` when it can live in a layer or feature module.

For map tools specifically:

- keep API orchestration and tool state in `useMapTools.js`
- keep temporary rendering in `MapToolOverlays.jsx`
- keep dialog UI in `MapToolDialogs.jsx`

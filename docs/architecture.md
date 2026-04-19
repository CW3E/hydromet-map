# Architecture

## Overview

The app is a React + MapLibre web map with a project-centered state model.

At a high level:

- `App.jsx` owns application state, bookmark state, and project switching.
- `mapConfig.js` defines reusable registries for basemaps, layers, raster families, and projects.
- `MapCanvas.jsx` renders the map, visible layers, built-in controls, overlay widgets, and popups.
- Layer modules in `src/layers/` encapsulate map sources, styles, hover/click behavior, and popup entry points.
- Popup feature modules in `src/features/` encapsulate remote CSV loading, plot/table/map configs, and popup UIs.

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

The current app has one raster family:

- `cnrfc`

But the structure now supports multiple families, with the rule that each project may reference at most one raster family.

## Important files

### App and state

- [src/App.jsx](../src/App.jsx)
- [src/lib/appState.js](../src/lib/appState.js)
- [src/config/mapConfig.js](../src/config/mapConfig.js)

### Map shell

- [src/components/map/MapCanvas.jsx](../src/components/map/MapCanvas.jsx)
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

## Data flow

### Render flow

1. `App.jsx` reads URL state and builds the active project state.
2. `App.jsx` derives the active project definition, active raster family, and selected raster variable.
3. `MapCanvas.jsx` receives only the active project's runtime state.
4. `MapCanvas.jsx` filters layer modules against the active project's `availableLayerIds`.
5. Each visible layer module renders sources/layers and optional popup content.
6. `MapHud.jsx` renders only the controls relevant to the active project's raster family and layers.

### Interaction flow

- pointer move:
  layer modules compute hover state through `getPointerState`
- click:
  visible layer modules may handle clicks through `handleClick`
- popup:
  selected feature state is stored in `selectedStation` and rendered by popup modules

## Design rules in the current app

- Projects may include zero or one raster family.
- Layers are globally reusable, but each project controls availability and order.
- Raster variables/products shown in the HUD always come from the active project's raster family.
- Bookmarks encode the active project and that project's visible state.

## Extension strategy

If you add new functionality, prefer extending one of these existing seams:

- add a new reusable layer module
- add a new raster family
- add a new project definition
- add a new popup feature module

Avoid pushing unrelated logic into `App.jsx` or `MapCanvas.jsx` when it can live in a layer or feature module.

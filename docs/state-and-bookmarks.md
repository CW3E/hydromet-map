# State and Bookmarks

## App state

Top-level state now follows a project-centered model:

```js
{
  activeProjectId,
  projectStateById
}
```

Runtime behavior:

- only the active project's state is rendered
- inactive project states stay in memory

Main implementation:

- [src/App.jsx](../src/App.jsx)
- [src/lib/appState.js](../src/lib/appState.js)

## Project state shape

Each project state contains:

```js
{
  view: {
    center,
    zoom,
    bearing,
    pitch,
  },
  basemapId,
  terrainEnabled,
  projection,
  layers,
  family,
}
```

`family` may be `null` if a project has no layer family.

## URL bookmarks

The current bookmark URL stores the active project's state.

New bookmark URLs use compact readable keys to keep QR codes smaller:

- `prj`: project
- `bm`: basemap
- `proj`: projection
- `ter`: terrain
- `c`: center
- `z`: zoom
- `brg`: bearing
- `pit`: pitch
- `var`: variable
- `prod`: product
- `ens`: ensemble
- `tm`: temporal mode
- `d`: date
- `dt`: datetime
- `lyr`: enabled layers
- `pop`: selected popup feature as `layerId|featureId|longitude|latitude`
- `tab`: active popup tab

Older long-form bookmark keys are still accepted when reading URLs:

- `project`
- `basemap`
- `projection`
- `terrain`
- `center`
- `zoom`
- `bearing`
- `pitch`
- `variable`
- `product`
- `ensemble`
- `temporalMode`
- `date`
- `datetime`
- `layers`
- `popup`
- `popupTab`

Important detail:

The bookmark stores the active project and that active project's visible state. It does not currently serialize the remembered states of other inactive projects.

Selected popup restore is intentionally compact. The URL stores a stable layer id, feature id, popup anchor coordinate, and active tab id. On load, the app recreates the popup from the rendered map feature near that coordinate instead of storing feature attributes or plot data in the URL.

## Read/write helpers

Bookmark logic lives in:

- [src/lib/appState.js](../src/lib/appState.js)

Main functions:

- `readStateFromUrl()`
- `writeStateToUrl(state)`

## Status boundary logic

`App.jsx` also applies remote status-based constraints to raster state:

- fetches latest boundary timestamp from `status.json`
- updates default family date/datetime on first load
- clamps max forecast range
- restricts product choices based on time relative to the boundary

This logic currently applies to every project that has a layer family.

## Practical implications

- Project switching preserves in-memory project state.
- Refreshing a bookmarked URL restores the bookmarked project's state.
- Layer visibility and family selector state are project-specific, not global.

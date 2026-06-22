# Popup Patterns Reference

Use this reference before adding or changing vector-layer popups in `hydromet-map`.

## First Search

Search existing examples before choosing a pattern:

- `src/layers/*Layer.jsx` for layer-local hover popups and click handlers.
- `src/features/*Popup` for richer clicked popups with config, data loading, tabs, plots, or downloads.
- `src/layers/bookmarkRestore.js` for popup restoration helpers.
- `src/components/PopupCsvDownloadButton.jsx` for CSV download behavior.
- `src/App.css` for shared popup classes such as `river-popup` and `station-popup`.

Useful searches:

- `rg -n "renderPopups|onHover|onClick|restorePopupFromBookmark|popupOwnerId|popupType" src`
- `rg -n "createSelected.*PopupState|load.*PopupTabData|applyBookmarkedPopupTab" src`

## Choose the Popup Pattern

Use a layer-local hover popup when the popup only displays a few feature attributes while the pointer is over a feature.

Use a clicked feature popup when the popup should persist after click, support tabs, fetch remote data, render plots, provide CSV downloads, or be restored from a bookmark.

Use or extend a feature popup folder under `src/features` when popup behavior needs separate config, data loading, plotting, tab state, or formatting helpers.

Avoid creating a separate feature folder for a tiny static hover popup unless nearby layers already use that pattern.

## Hover Popup Checklist

1. Add or reuse a hit layer with generous hit styling when needed.
2. Add `stateKey` for the hovered object using the local naming pattern.
3. Implement `onHover` to find the feature by the intended layer ID.
4. Build a small normalized hover object from `event.lngLat` and feature properties.
5. Clear hover state when no feature is under the pointer.
6. Add or update the highlight layer filter so hover styling follows the selected feature.
7. Implement `renderPopups` with `Popup`, `closeButton={false}`, and the existing lightweight class when appropriate.
8. Keep hover popups synchronous. Do not fetch CSV, remote JSON, or plot data from hover.

## Clicked Popup Checklist

1. Add `onClick` to locate the clicked feature from the intended layer ID.
2. Guard against unsupported geometry types before building popup state.
3. Create selected popup state with a stable `popupType`, `popupOwnerId`, coordinates, feature ID, display fields, and nested `popup` state.
4. Render the clicked popup from the layer's `renderPopups` path, usually by delegating to a component under `src/features`.
5. Keep close behavior wired through `setSelectedStation(null)` or the current app convention.
6. If the popup fetches data, store loading/error/data per tab or per plot ID so partial failures are visible.
7. Avoid sharing mutable popup state between different layers that can open similar popups. Use `popupOwnerId` to disambiguate.

## Time-Series Popup Checklist

For tabbed plot popups:

1. Put tab, product, plot, URL, and formatter definitions in a `*PopupConfig.js` file.
2. Put state builders, tab changes, fetches, parsing, and plot assembly in a `*PopupData.js` file.
3. Put the React popup shell in a `*Popup.jsx` file.
4. Reuse `TimeSeriesPlot` when the requested chart matches existing Plotly behavior.
5. Reuse `PopupCsvDownloadButton` when the user can download source CSVs.
6. Use existing loading, error, empty, and tab panel classes unless the popup truly needs new styling.
7. Trigger initial data loading from click handling or popup mount following the nearest existing popup family.

## Bookmark Restoration

When a clicked popup should survive shared URLs:

- Add `restorePopupFromBookmark` to the owning layer module.
- Use `findBookmarkFeatureAtPoint` or the nearest existing helper to recover the source feature.
- Rebuild selected popup state from the recovered feature and bookmarked coordinates.
- Apply bookmarked tab/product state with `applyBookmarkedPopupTab` or the local equivalent.
- Load the active tab after restoring if the popup normally fetches data.
- Preserve old bookmark URLs when changing popup state keys.

## Formatting and Missing Data

- Normalize feature properties once in a builder function instead of formatting raw properties inside JSX.
- Use consistent units in labels and include units only when values exist.
- Prefer `Unknown`, `N/A`, or the existing local placeholder for missing values.
- Keep expensive formatting out of render loops when possible.
- Escape or treat feature properties as text; do not inject raw HTML from data sources.

## Mobile and Map Behavior

- Keep hover-only information nonessential because mobile users may not hover.
- Ensure clicked popups fit narrow screens and do not hide all map controls.
- Check tab labels, select controls, download buttons, and plot panels at mobile widths.
- Avoid opening multiple persistent clicked popups at once unless the app already supports it.
- Confirm map dragging suppresses or does not visually fight with popups, matching existing CSS behavior.

## Final Review

Before finishing a popup change, verify:

- The correct layer ID is queried for hover/click.
- Pointer state clears when leaving the feature.
- Highlight filters use stable feature IDs/properties.
- Popup state is cleared on close.
- Loading and error states are visible for remote data.
- Bookmark restore works or is intentionally out of scope.
- Existing popups for neighboring layers still work.

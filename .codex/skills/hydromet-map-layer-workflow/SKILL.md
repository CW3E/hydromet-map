---
name: hydromet-map-layer-workflow
description: Project-specific workflow for adding, modifying, or debugging hydromet-map map layers and layer families. Use when Codex works on GeoJSON/vector layers, vector tile layers, raster tile overlays, raster families across variables/dates/products/ensembles, MapLibre rendering style, layer source registration, layer controls, hover/click feature info, legends/colormaps, time-series popup hooks, or bookmarkable layer state in the hydromet-map repository.
---

# Hydromet Map Layer Workflow

Use this skill to make layer changes in the `hydromet-map` repository consistent across map rendering, controls, legends, interactions, and bookmark state.

## Start Here

1. Inspect the current implementation before editing:
   - `src/config/mapConfig.js`
   - `src/components/map/MapCanvas.jsx`
   - components that own layer controls, raster selectors, legends, popups, or bookmark URLs
2. Identify whether the request is for:
   - a single GeoJSON/vector source
   - a vector tile source/layer
   - a single raster/raster tile overlay
   - a raster family with variable/date/product/ensemble dimensions
   - interaction-only changes such as hover, click, popup, or time-series behavior
3. Preserve existing naming, grouping, and config conventions. Add new abstractions only when they reduce repeated layer-family logic or match an existing local pattern.

## File Discovery

Use fast local search first:

- Search layer IDs, source IDs, family IDs, and visible UI labels with `rg`.
- Search for `sources`, `layers`, `raster`, `legend`, `colormap`, `hover`, `popup`, `bookmark`, `projection`, and `terrain` when the exact owning file is unclear.
- Read surrounding config objects before assuming shape or defaults.

## Add or Modify a Single Layer

1. Locate the source definition and existing sibling layers.
2. Add or update the source using the same schema style as nearby layers.
3. Add or update the MapLibre layer definition with stable `id`, `source`, `source-layer` when applicable, `type`, `paint`, `layout`, and min/max zoom if needed.
4. Register the layer in the UI/control config so it can be toggled in the expected group.
5. Add hover or click metadata only where the app already centralizes interaction behavior.
6. Ensure default visibility, ordering, and opacity match the layer's purpose.
7. Verify the layer participates correctly in bookmark serialization if visibility or settings are user-controlled.

## Add or Modify a Raster Family

1. Determine the dimension model: variable, product, date, ensemble trace, lead time, or other axes.
2. Locate the URL/template builder or config entry used by existing raster families.
3. Keep dimension keys bookmark-friendly: short, stable, URL-safe, and independent of display labels.
4. Register display labels separately from machine keys.
5. Wire selector UI defaults and forward/back controls without hardcoding assumptions that only fit one product.
6. Attach the correct colormap or legend for each variable, and update legend switching when the selected variable changes.
7. Ensure raster source/layer IDs are deterministic and do not collide with sibling families.
8. Include selected family/dimension state in bookmark load/save behavior.
9. Check mobile controls for cramped selectors, date controls, and legend layout.

## Interactions

For hover/click behavior:

- Reuse existing feature-query and cursor patterns in `MapCanvas.jsx` or nearby interaction helpers.
- Keep hover info declarative when possible: define which properties appear, their labels, and formatting rules in config.
- Do not fetch time-series data on hover.
- For click-driven time series, identify the clicked feature ID/properties, build the remote CSV request from config, parse with the repo's existing CSV/parser path, and display multiple series as tabs if the data source provides more than one series.
- Preserve existing behavior for layers that do not opt into hover/click handlers.

## Legends and Colormaps

- For categorical/vector layers, prefer explicit label/color mappings.
- For continuous rasters, use the predefined colormap associated with the selected variable.
- Keep legend data close to variable/layer config unless the repo already centralizes legends elsewhere.
- Ensure legend updates when raster variable or layer visibility changes.
- Avoid duplicating color stops between rendering config and legend config unless the existing architecture requires it.

## Bookmark State

When a change adds user-controlled map state, update bookmark load/save paths for:

- map view: center, zoom, bearing, pitch
- basemap style
- terrain enabled/disabled
- projection mode: globe or mercator
- layer visibility
- raster family selections: variable, date, product, ensemble, and other dimensions
- any new opacity or styling control exposed to users

Use compact, stable query parameter keys and preserve backward compatibility with existing shared URLs when possible.

## Verification Checklist

Before finishing:

1. Run the repo's relevant validation command, usually `npm run build` when available.
2. Confirm no unrelated user edits were reverted.
3. Check that toggles, layer order, opacity, hover/click behavior, legends, and bookmark restoration still work for affected layers.
4. For raster-family work, test at least two variables or products when config allows it.
5. For UI changes, check a narrow/mobile viewport for selector wrapping and map control overlap.

## Optional Reference

Read `references/layer-patterns.md` when the task needs a more detailed checklist for choosing IDs, organizing config, or reviewing raster-family dimensions.

---
name: hydromet-map-config-workflow
description: Project-specific workflow for adding, modifying, or debugging hydromet-map map configuration and for guiding meteorology or hydrology domain experts from a data idea to a reviewed map contribution. Use when Codex works on projects, GeoJSON/vector layers, vector tile layers, raster tile overlays, raster families, particle tracer or gridded vector-field layers, MapLibre custom WebGL rendering, layer source registration, controls, popups, legends/colormaps, project defaults, bookmarkable map state, or scientist-led layer and project proposals in the hydromet-map repository.
---

# Hydromet Map Config Workflow

Use this skill to make map configuration changes in the `hydromet-map` repository consistent across projects, map rendering, controls, legends, interactions, and bookmark state.

## Start Here

1. Determine whether the requester is providing scientific intent or directing
   implementation. For a domain-expert proposal, incomplete request, sample
   dataset, or visualization idea, read `references/domain-contributor-intake.md`
   before asking questions or editing. Keep Git, CI, and framework mechanics in
   the background unless the requester wants them.
2. Inspect the current implementation before editing:
   - `src/config/mapConfig.js`
   - `src/components/map/MapCanvas.jsx`
   - components that own project selection, layer controls, raster selectors, legends, popups, or bookmark URLs
3. Identify whether the request is for:
   - a project or project default
   - a single GeoJSON/vector source
   - a vector tile source/layer
   - a single raster/raster tile overlay
   - a raster family with variable/date/product/ensemble dimensions
   - an animated particle tracer or custom WebGL vector field
   - interaction-only changes such as hover, click, popup, or time-series behavior
4. Preserve existing naming, grouping, and config conventions. Add new abstractions only when they reduce repeated configuration logic or match an existing local pattern.

## File Discovery

Use fast local search first:

- Search project IDs, layer IDs, source IDs, family IDs, and visible UI labels with `rg`.
- Search for `project`, `sources`, `layers`, `raster`, `legend`, `colormap`, `hover`, `popup`, `bookmark`, `projection`, and `terrain` when the exact owning file is unclear.
- Read surrounding config objects before assuming shape or defaults.

## Add or Modify a Project

1. Locate the project registry, selector config, and any project-specific defaults.
2. Add or update the project ID, label, description, default view, basemap, projection, terrain setting, and default layer visibility using existing conventions.
3. Assign layers and layer families to the project through the current grouping mechanism.
4. Check whether project switching should reset, preserve, or adapt raster selections, selected popups, legends, and bookmark state.
5. Read `references/project-patterns.md` before adding a new project or changing project defaults.

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
- Read `references/popup-patterns.md` before adding or refactoring vector-layer popups.

## Add or Modify a Particle Tracer Layer

1. Read `docs/particle-tracers.md` and `references/particle-tracer-patterns.md` before editing.
2. Decide whether the change is a compatible dataset replacement, a new model/variable using the existing published contract, a contract/renderer change, or a second simultaneously visible tracer.
3. Verify the two components, units, grid order, longitude convention, mask, quantization limit, time steps, and CORS behavior.
4. Keep dataset metadata declarative: manifest URL, units, palette, family defaults, and bookmark fields belong in configuration.
5. Generalize GFS- or IVT-specific names before reusing the renderer for a different source or physical field.
6. Preserve the direct RGBA decoder: its alpha byte carries component data and must not be premultiplied.
7. Verify custom-layer restoration after basemap style reload, forecast selection, dateline continuity, regional edge behavior, legend correctness, and browser performance.

## Legends and Colormaps

- For categorical/vector layers, prefer explicit label/color mappings.
- For continuous rasters, use the predefined colormap associated with the selected variable.
- Keep legend data close to variable/layer config unless the repo already centralizes legends elsewhere.
- Ensure legend updates when raster variable or layer visibility changes.
- Avoid duplicating color stops between rendering config and legend config unless the existing architecture requires it.

## Bookmark State

When a change adds user-controlled map state, update bookmark load/save paths for:

- map view: center, zoom, bearing, pitch
- project
- basemap style
- terrain enabled/disabled
- projection mode: globe or mercator
- layer visibility
- raster family selections: variable, date, product, ensemble, and other dimensions
- selected popup state when the app supports popup restoration
- any new opacity or styling control exposed to users

Use compact, stable query parameter keys and preserve backward compatibility with existing shared URLs when possible.

## Verification Checklist

Before finishing:

1. Run the repo's relevant validation command, usually `npm run build` when available.
2. Confirm no unrelated user edits were reverted.
3. Check that project switching, toggles, layer order, opacity, hover/click behavior, legends, and bookmark restoration still work for affected configuration.
4. For raster-family work, test at least two variables or products when config allows it.
5. For UI changes, check a narrow/mobile viewport for selector wrapping and map control overlap.
6. For particle tracers, also test a basemap switch without changing time, dateline/world wrapping, at least two time steps, remote CORS loading, and representative browser performance.

## Optional References

Read `references/domain-contributor-intake.md` when a meteorologist,
hydrologist, data producer, or other domain expert describes data or intended
map behavior without specifying implementation details. Also read it when an
agent is turning a GitHub layer/project proposal into an implementation.

Read `references/project-patterns.md` when the task adds a new project, changes project defaults, assigns layers to projects, or updates project-specific bookmark behavior.

Read `references/layer-patterns.md` when the task needs a more detailed checklist for choosing IDs, organizing config, or reviewing raster-family dimensions.

Read `references/popup-patterns.md` when the task adds hover popups, clicked feature popups, tabbed time-series popups, CSV downloads, or bookmark-restored popups.

Read `references/particle-tracer-patterns.md` when the task adds, replaces, tunes, or debugs animated particle tracers, their manifests/textures, or custom WebGL lifecycle behavior.

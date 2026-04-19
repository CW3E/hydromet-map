# Raster Families

## Purpose

A raster family defines the raster overlay behavior for a project.

Each project may include:

- zero raster families
- or exactly one raster family

This keeps the raster selectors unambiguous and avoids overlapping raster overlays.

## Current location

Raster family definitions live in [src/config/mapConfig.js](../src/config/mapConfig.js) under `RASTER_FAMILIES`.

Current family:

- `cnrfc`

## What a raster family defines

Typical fields:

```js
{
  id,
  label,
  layerId,
  variables,
  products,
  ensembleTraces,
  defaultDate,
  defaultDateTime,
}
```

## Variable definitions

Raster variables currently live under `CNRFC_RASTER_VARIABLES`.

Each variable defines:

- `label`
- `units`
- `timestep`
- `coordinates`
- `palette`
- `buildRasterUrl`

Example shape:

```js
precipitationDaily: {
  label: 'Daily P',
  units: 'mm',
  timestep: '1day',
  coordinates: ...,
  palette: {
    thresholds: [...],
    colors: [...],
  },
  buildRasterUrl: ({ date, product }) => ...,
}
```

## How selector options are derived

The raster toolbar in [src/components/map/MapHud.jsx](../src/components/map/MapHud.jsx) reads everything from the active project's raster family.

That means:

- variable options come from `rasterFamily.variables`
- product options come from `rasterFamily.products`
- ensemble options come from `rasterFamily.ensembleTraces`

The selected variable also determines whether the app uses:

- date mode
- or datetime mode

through `getTemporalModeForTimestep()`.

## Project-level raster defaults

Projects can override family defaults through `defaultRaster`.

Current examples:

- `cnrfc` defaults to `soilMoistureDaily`
- `b120` defaults to `sweDaily`

This is implemented by merging `projectDefinition.defaultRaster` over `buildDefaultRasterState(rasterFamily)` in [src/config/mapConfig.js](../src/config/mapConfig.js).

## Raster rendering

Raster rendering happens in [src/layers/cnrfcRasterLayer.jsx](../src/layers/cnrfcRasterLayer.jsx).

Behavior:

- if `buildRasterUrl()` returns a valid PNG URL, the raster is rendered as an image source
- otherwise, a placeholder polygon is rendered using the variable palette

Current opacity:

- `0.7`

## When adding a new raster family

1. Add a new entry to `RASTER_FAMILIES`.
2. Define a variable registry for that family.
3. Assign a layer id for the family.
4. Reference the family from a project through `rasterFamilyId`.
5. Optionally set project-specific `defaultRaster`.

## Recommendation

If the new raster source has:

- a different domain
- a different variable list
- a different product list
- or different date semantics

prefer creating a new raster family and a new project rather than overloading the existing `cnrfc` family.

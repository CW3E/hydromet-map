# Particle Tracer Layers

Particle tracers visualize a gridded two-component vector field as moving, fading paths. The current implementation displays GFS integrated vapor transport (IVT), but its published-data contract can also support winds, moisture flux, ocean currents, and fields from other models.

## Architecture

The data path is:

1. A model-specific preprocessing job derives or extracts horizontal components.
2. The job publishes one RGBA texture and validity mask per time step, plus a manifest.
3. Layer-family configuration supplies the manifest URL, units, palette, defaults, and bookmark fields.
4. `GfsIvtParticlesLayer.jsx` loads and decodes the selected time step, advects particles, and draws their trails as a MapLibre custom layer.
5. `GfsIvtControls.jsx` and `MapHud.jsx` expose forecast-time selection and a magnitude legend.

The preprocessor can be model-specific. Keeping its output compatible with the contract below lets the web renderer remain reusable.

## Published Data Contract

The manifest is JSON with this minimum structure:

```json
{
  "schemaVersion": 1,
  "model": "model and resolution label",
  "initializationTime": "2026-08-12T18:00:00Z",
  "units": "kg m-1 s-1",
  "grid": {
    "width": 581,
    "height": 321,
    "west": 115,
    "east": 260,
    "south": -10,
    "north": 70,
    "dx": 0.25,
    "dy": 0.25
  },
  "rowOrder": "north-to-south",
  "encoding": {
    "format": "png-rgba8-ivt-components",
    "componentLimit": 2000,
    "u16": "R * 256 + G",
    "v16": "B * 256 + A"
  },
  "timesteps": [
    {
      "forecastHour": 0,
      "validTime": "2026-08-12T18:00:00Z",
      "texture": "textures/example.png",
      "mask": "textures/example_mask.png",
      "ranges": {},
      "clippedFraction": 0,
      "validFraction": 1,
      "grid": {}
    }
  ]
}
```

Each time step's `grid` must match the top-level grid. Relative texture and mask URLs are resolved against the manifest URL, so the published directory can be moved as a unit. The web server must allow cross-origin requests from the map application.

### Component encoding

Each signed component is linearly quantized to an unsigned 16-bit integer over `[-componentLimit, componentLimit]`:

```text
u16 = R * 256 + G
v16 = B * 256 + A
component = (encoded / 65535) * (2 * componentLimit) - componentLimit
```

The alpha byte contains the low byte of the second component; it is data, not transparency. Browser image paths that premultiply RGB by alpha corrupt the field. The renderer therefore decodes the non-interlaced RGBA8 PNG directly. Preserve this behavior in any replacement decoder or GPU upload path. Invalid cells belong in the separate 8-bit mask, where 255 is valid and 0 is invalid.

Choose `componentLimit` from realistic component extremes and inspect `clippedFraction`. Increasing the limit reduces clipping but also reduces quantization precision.

## Grid and Longitude Conventions

- Texture rows run north to south and columns run west to east.
- A normal regional domain uses increasing signed longitudes, such as `-140` to `-110`.
- A dateline-crossing region uses continuous, unwrapped longitudes, such as `115` to `260`, rather than a decreasing `115` to `-100` interval.
- A global grid is periodic in longitude. Avoid duplicating both longitude endpoints; for a 0.25-degree grid, `-180` through `179.75` is appropriate.
- Regional grids are not periodic. Particles that leave the data domain are reseeded.

The renderer draws nearby world copies so an unwrapped regional domain remains continuous when the map is centered on either side of the dateline.

## Registering a Dataset

Current integration points are:

- `src/config/mapConfig.js`: dataset config, layer family, defaults, bookmark fields, and project assignment
- `src/layers/gfsIvtParticlesLayer.jsx`: layer registry adapter
- `src/layers/index.js`: layer registration
- `src/components/map/MapCanvas.jsx`: custom-layer rendering
- `src/components/map/MapHud.jsx`: forecast control and legend
- `src/features/gfsIvtParticles/`: decoder, simulation, rendering, and controls

A shared dataset config currently has this shape:

```js
const VECTOR_DATASET = {
  manifestUrl: 'https://example.org/run/manifest.json',
  units: 'kg m⁻¹ s⁻¹',
  palette: {
    thresholds: ['0', '250', '500', '750'],
    colors: ['#dbeafe', '#38bdf8', '#2563eb', '#22c55e'],
  },
}
```

It can be a dedicated family with `kind: 'ivt-particles'`, or be attached as `.ivt` to a composite family such as AR Recon. Forecast hour uses the family-state key `forecastHour` and bookmark key `fh`. Keep existing IDs stable for shared URLs. If two tracer datasets must be visible simultaneously, give them distinct layer and custom-layer IDs and first refactor the renderer away from its GFS-specific singleton assumptions.

For a different physical variable, also make labels, units, component names, magnitude thresholds, and error messages configuration-driven. Do not call a wind or current field IVT merely because it uses the same texture encoding.

## Performance and Visual Tuning

The current prototype performs particle advection and trail assembly on the CPU. Its principal constants in `GfsIvtParticlesLayer.jsx` are:

- `PARTICLE_COUNT = 6400`
- `MAX_AGE = 280`
- `HISTORY_LENGTH = 64`

Particle count has the largest steady-state cost. Trail history affects both memory and per-frame geometry work. Texture dimensions mainly affect download, PNG decoding, and field-sampling memory. Prefer regional layers for a dense display on ordinary hardware. A future general-purpose implementation should move these values into dataset or quality configuration; a substantially larger workload should use GPU state textures or transform feedback.

The custom layer must be recreated after a basemap style reload. Test this explicitly whenever lifecycle code changes.

## Adding Another Model or Variable

1. Identify the eastward and northward components, units, grid orientation, missing-data convention, and vertical integration method if applicable.
2. Convert them to the manifest, RGBA texture, and mask contract. The existing `tools/gfs_ivt` utility is a reference implementation, not a universal model reader.
3. Publish multiple time steps with CORS enabled and verify all relative URLs.
4. Add a dataset and layer-family configuration with an appropriate label, units, palette, defaults, and bookmark field.
5. Generalize GFS- or IVT-specific UI text before using the renderer for another source or variable.
6. Decide whether the new layer replaces an existing tracer or must coexist with it; coexistence requires unique renderer IDs.

## Validation Checklist

- Compare decoded component and magnitude ranges with the source data.
- Confirm width, height, bounds, spacing, and north-to-south row order.
- Keep `clippedFraction` acceptably small and investigate low `validFraction`.
- Exercise at least two time steps and confirm the displayed valid time.
- Check the layer after basemap and project switches.
- Pan across the dateline and across adjacent world copies.
- Check regional edge reseeding and global periodic motion.
- Confirm palette thresholds, units, and legend layout.
- Test a narrow viewport and a representative lower-powered browser.
- Run `npm run build` after application-code or configuration changes.


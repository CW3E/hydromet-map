# Particle Tracer Patterns

Read `docs/particle-tracers.md` before changing a particle tracer, its published data, or its renderer. It defines the manifest and texture contract, longitude conventions, integration points, performance limits, and validation checklist.

## Routing

- Preprocessing and publishing: `tools/gfs_ivt/`
- Shared dataset and family configuration: `src/config/mapConfig.js`
- Map layer registry: `src/layers/gfsIvtParticlesLayer.jsx` and `src/layers/index.js`
- Renderer and decoder: `src/features/gfsIvtParticles/GfsIvtParticlesLayer.jsx`
- Forecast selector: `src/features/gfsIvtParticles/GfsIvtControls.jsx`
- Map lifecycle: `src/components/map/MapCanvas.jsx`
- Controls and legend: `src/components/map/MapHud.jsx`

Search these symbols before editing: `GFS_IVT_NORTH_PACIFIC`, `ivt-particles`, `gfsIvtParticles`, `initializationDate`, `forecastHour`, `gid`, and `fh`.

For archived runs, configure a dataset-level `catalogUrl` plus a known-good
`manifestUrl` fallback. Catalog manifests should be relative URLs so the archive
can move as one directory tree. Initialization date and forecast hour are
separate family state fields and both should remain bookmarkable. Generate the
catalog with `tools/gfs_ivt/build_catalog.py` after publishing new runs.

## Procedure

1. Determine whether the task changes only a manifest URL/palette, introduces a compatible dataset, changes the published contract, or requires simultaneous tracer layers.
2. Preserve stable project, family, layer, and bookmark IDs unless the request requires a new independently visible layer.
3. For a compatible replacement, reuse the shared dataset config shape: `manifestUrl`, `units`, and `palette`.
4. For another model or variable, keep the published contract but make source- or IVT-specific labels generic where they become visible.
5. For simultaneous tracers, remove singleton assumptions and create unique MapLibre custom-layer IDs before registering both.
6. Run the particle-specific checks below, then the general skill verification checklist.

## Fragile Invariants

- RGBA is packed data: `R/G` encode the first signed 16-bit component and `B/A` encode the second. Alpha must never be premultiplied.
- The separate mask, not alpha, marks invalid pixels.
- Rows are north to south; columns are west to east.
- Dateline-crossing regional bounds are unwrapped and increasing, for example `115..260`.
- Global longitude data are periodic and should not duplicate the endpoint.
- Regional fields are nonperiodic and reseed particles at their edges.
- Relative texture paths resolve against the manifest URL and require working CORS headers.
- Basemap changes reload the MapLibre style, so the custom layer must be restored.
- `PARTICLE_COUNT`, `HISTORY_LENGTH`, and `MAX_AGE` directly affect CPU and memory cost.

## Particle-Specific Verification

- Decode a sample texture and compare its ranges to manifest/source statistics.
- Test at least two forecast hours.
- Switch basemaps without changing forecast time and confirm particles return.
- Pan through the dateline in both directions.
- Check the palette, magnitude legend, units, and narrow-screen layout.
- Inspect performance before increasing density or trail length.

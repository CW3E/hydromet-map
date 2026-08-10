# Utility Tools

This folder is for sidecar tools that support the map project but are not part of the app runtime or production bundle.

Current tools:

- [Bookmark snapshots](./snapshots/README.md): open bookmarked app URLs in a headless browser and export map or popup plot screenshots.
- [CW3E SurfaceMetObs processor](./cw3e_obs/README.md): normalize station-specific hourly observation files into rolling and yearly CSV products.
- [AR Recon 3D flight converter](./ar_recon/README.md): combine aircraft HDOBS positions and QC NetCDF dropsondes into browser-friendly flight bundles.

Keep utilities here when they are useful for documentation, reports, QA, or batch processing but should not be shipped as user-facing app features.

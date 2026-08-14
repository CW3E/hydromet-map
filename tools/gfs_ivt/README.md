# GFS IVT WebGL preprocessing

`build_gfs_ivt.py` downloads pressure-level GFS forecast subsets from NOAA
NOMADS, calculates vertically integrated vapor transport (IVT), and creates
textures suitable for a WebGL particle-advection layer.

## Environment

The easiest supercomputer setup is a small Conda environment because `cfgrib`
needs the ECMWF ecCodes native library:

```bash
conda create -n gfs-ivt -c conda-forge python=3.11 cfgrib eccodes numpy pillow requests xarray
conda activate gfs-ivt
```

Alternatively, use a Python environment where ecCodes is already installed:

```bash
python -m pip install -r tools/gfs_ivt/requirements.txt
```

## Example

Choose a GFS date and cycle that exist on NOMADS. This downloads analysis
through forecast hour 48 at three-hour intervals over the Northeast Pacific:

```bash
python tools/gfs_ivt/build_gfs_ivt.py \
  --date 20260812 \
  --cycle 18 \
  --hours 0:48:3 \
  --output /path/to/web-root/gfs-ivt/20260812/18
```

For an explicit set of hours, use `--hours 0,6,12,18,24`. Add
`--delete-grib` to remove each source GRIB after successful processing.

For a Web Mercator-compatible global field, use:

```bash
python tools/gfs_ivt/build_gfs_ivt.py \
  --date 20260812 \
  --cycle 18 \
  --hours 0:48:3 \
  --west -180 --east 180 \
  --south -85 --north 85 \
  --output /path/to/web-root/gfs-ivt/20260812/18-global
```

The script recognizes the 360-degree span and sends NOMADS `leftlon=0` and
`rightlon=360`. If NOAA returns both copies of the zero-degree meridian, the
duplicate column is removed. The expected 0.25-degree grid is 1440 × 681.

For a regional Pacific domain that crosses the antimeridian, provide a western
bound numerically greater than the eastern bound:

```bash
python tools/gfs_ivt/build_gfs_ivt.py \
  --date 20260812 \
  --cycle 18 \
  --hours 0:48:3 \
  --west 100 --east -100 \
  --south 0 --north 70 \
  --output /path/to/web-root/gfs-ivt/20260812/18-pacific
```

This is written as one continuous unwrapped grid from 100° through 260°E.
The manifest therefore reports `west: 100` and `east: 260`; the WebGL layer's
wrapped-world rendering places it correctly on a Pacific-centered map without
introducing a seam at ±180°.

The default domain is 10–70°N, 180–100°W. The script requests specific
humidity, U wind, and V wind at 17 pressure levels from 1000 to 300 hPa plus
surface pressure. It uses surface pressure to limit the lower integration
boundary and writes:

```text
output/
  manifest.json
  raw/*.grib2
  textures/*_ivt.png
  textures/*_mask.png
```

Ordinary regional output uses signed longitudes ordered west-to-east. A region
that crosses the antimeridian uses continuous unwrapped longitudes as described
above. Rows are always ordered north-to-south.

The surface pressure parameter is called `PRES` by GFS. It is downloaded as a
small companion GRIB because NOMADS requires both `var_PRES=on` and
`lev_surface=on`. Separating it also lets an existing pressure-level download
be reused if its original request omitted the surface level. Depending on the
installed ecCodes definitions, cfgrib may expose it as `sp`, `pres`, or another
generated variable name; the script recognizes the field from its GRIB
metadata rather than requiring one spelling.

## Texture encoding

Each RGBA8 IVT texture holds two signed 16-bit components:

- `u16 = R * 256 + G`
- `v16 = B * 256 + A`
- `component = (encoded / 65535) * (2 * limit) - limit`

The default symmetric component limit is ±2000 kg m-1 s-1. The manifest
records the limit, decoding expressions, actual data ranges, and clipped
fraction for every timestep. Increase `--component-limit` if clipping is not
zero or if the target forecast can contain more extreme transport.

Because alpha stores data, load the image without alpha premultiplication or
color conversion. With `createImageBitmap`, use:

```js
const bitmap = await createImageBitmap(blob, {
  premultiplyAlpha: 'none',
  colorSpaceConversion: 'none',
})
```

Use nearest filtering for exact decoding, or manually bilinearly interpolate
four decoded vector samples in the particle shader. The mask texture prevents
particles from entering cells without valid atmospheric data.

## Scientific scope

This is a visualization preprocessing pipeline, not an operational IVT
verification package. It integrates from 300 hPa to local surface pressure
using the available pressure levels. When surface pressure exceeds 1000 hPa,
the script extends the 1000 hPa transport value to the surface. A production
workflow should compare its output against an independently validated IVT
product and document the chosen vertical bounds and below-ground treatment.

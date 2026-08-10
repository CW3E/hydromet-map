# AR Recon 3D flight converter

This utility converts one aircraft directory from the CW3E AR Recon archive into a stable,
browser-friendly bundle for MapLibre/Three.js. It combines the continuous aircraft locations
from `HDOBS` reports with independent dropsonde trajectories from QC NetCDF files.

The converter has been designed against both observed 2026 layouts:

- NOAA directories such as `IOP42/NOAA-GIV`, where QC NetCDF filenames include the flight ID.
- Air Force directories such as `IOP40/AF303` and `IOP40/AF309`, where QC NetCDF files use
  `D<timestamp>QC.nc` names and the directories contain many additional raw products.

Only local files are read. The utility does not crawl or download the public archive.

## Install

Python 3.10 or newer is recommended. Create an environment and install the NetCDF dependency:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r tools/ar_recon/requirements.txt
```

On Windows, activate the environment with `.venv\Scripts\activate`.

## Run

NOAA example:

```bash
python tools/ar_recon/build_flight.py \
  --input /data/CW3E_data/CW3E_DataShare/ARRecon/2026/IOP42/NOAA-GIV \
  --output /path/to/published/ar_recon/20260312N1 \
  --flight-id 20260312N1 \
  --compact
```

Air Force examples:

```bash
python tools/ar_recon/build_flight.py \
  --input /data/CW3E_data/CW3E_DataShare/ARRecon/2026/IOP40/AF303 \
  --output /path/to/published/ar_recon/IOP40-AF303 \
  --flight-id IOP40-AF303 \
  --compact

python tools/ar_recon/build_flight.py \
  --input /data/CW3E_data/CW3E_DataShare/ARRecon/2026/IOP40/AF309 \
  --output /path/to/published/ar_recon/IOP40-AF309 \
  --flight-id IOP40-AF309 \
  --compact
```

Passing `--flight-id` is recommended for published data. When it is omitted, the converter uses
the most common NetCDF `Flight` attribute and applies known NOAA/Air Force ID patterns.

Use `--gap-seconds` to control when missing HDOBS observations split the aircraft line into
separate rendered segments. The default is 90 seconds. The converter never interpolates gaps.

## Output contract

```text
<flight>/
├── manifest.json
├── aircraft.json
├── processing_report.json
└── sondes/
    ├── index.json
    └── <sonde-id>.json
```

- `manifest.json` is the entrypoint. It contains stable flight metadata, time and spatial bounds,
  available variables, and relative URLs.
- `aircraft.json` contains the chronological HDOBS track and segment index ranges.
- `sondes/index.json` lists every successfully converted sonde and its launch-to-aircraft QA match.
- `sondes/<sonde-id>.json` contains one independent, chronological dropsonde trajectory.
- `processing_report.json` records discovered/loaded file counts, skipped rows, duplicates, and
  warnings. Review it before publishing every conversion.

Coordinate arrays are column-oriented and share an index. `timeOffsetSeconds` is relative to the
`originTime` in `manifest.json`. Longitude and latitude remain WGS84 degrees, and altitude remains
meters above mean sea level; MapLibre conversion and optional vertical exaggeration belong in the
browser renderer.

## Build the multi-flight catalog

After converting all aircraft directories, scan the published JSON root to create the catalog used
by hydromet-map's Year, IOP, and Flight controls:

```bash
python tools/ar_recon/build_catalog.py \
  --input /path/to/published/ar_recon/json \
  --compact
```

This writes `/path/to/published/ar_recon/json/index.json`. Run it again whenever flights are added
or rebuilt. It recursively discovers `manifest.json` files and expects their paths to contain the
`year/IOP/aircraft` hierarchy.

Missing source values are emitted as JSON `null`. Coordinate rows without a complete time,
longitude, latitude, and altitude tuple are omitted because they cannot produce a 3D vertex.

## Discovery and scientific handling

- HDOBS files are discovered below any case-insensitive `HDOBS` directory.
- Sonde inputs are NetCDF files whose names contain `QC`.
- NOAA and Air Force QC NetCDF files currently share the same CF trajectory variables.
- `alt` is preferred over `gpsalt`; the selected source variable is recorded per sonde.
- The `-999` and `-9999` missing-value sentinels are removed.
- Sonde observations are sorted by absolute UTC time because source arrays may be stored from the
  surface backward toward launch.
- HDOBS coordinates are decoded from degrees/minutes. Reports that cross midnight are assigned to
  the date nearest the report timestamp.
- Duplicate aircraft timestamps keep the later-discovered observation and are reported.
- No meteorological interpolation or additional scientific quality control is performed.

## Tests

The unit tests use synthetic NOAA, Air Force, and NetCDF-compatible records and do not require the
public archive:

```bash
cd tools/ar_recon
python -m unittest -v
```

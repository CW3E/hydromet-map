# CW3E SurfaceMetObs hourly processor

This dependency-free Python utility converts the station-specific, headerless hourly files in
`CW3E_SurfaceMetObs` into stable CSV files suitable for the hydromet map and other downstream
applications.

## Run

The raw archive path defaults to the production filesystem location supplied for this dataset:

```bash
python tools/cw3e_obs/process_hourly.py --output /path/to/published/cw3e_obs
```

An explicit invocation looks like:

```bash
python tools/cw3e_obs/process_hourly.py \
  --input /data/CW3E_data/CW3E_DataShare/CW3E_SurfaceMetObs \
  --output /path/to/published/cw3e_obs \
  --rolling-days 183 \
  --timezone source-local-unspecified
```

Process a small station subset while testing:

```bash
python tools/cw3e_obs/process_hourly.py \
  --output ./cw3e_obs-test \
  --stations SIO SKI
```

The `--timezone` value is metadata only. Source timestamps are written without a UTC offset
because the archive guide and station readmes sampled during development do not establish a
single authoritative timezone for the full network. Set a more specific value only after
confirming the source convention.

## Output

```text
cw3e_obs/
├── stations.json
├── processing_report.json
├── schemas/
│   └── SIO.json
└── hourly/
    └── SIO/
        ├── latest_183d.csv
        ├── 2024.csv.gz
        └── 2025.csv.gz
```

- `stations.json` is the machine-readable station, variable, year, and latest-file manifest.
- `processing_report.json` records missing schemas, malformed rows, unexpected column counts,
  duplicate timestamps, and timestamp errors.
- `schemas/{STATION}.json` preserves the mapping from each numbered README field to its
  normalized column name.
- `hourly/{STATION}/{YEAR}.csv.gz` contains the complete normalized year.
- `hourly/{STATION}/latest_183d.csv` contains the approximately six-month rolling window ending
  at that station's latest available observation, not at the computer's current date.

The processor discovers station-root schema files case-insensitively using both common naming
forms, including `BKR_HourlyData.txt` and `BBY_HourlyData_README.txt`. Files containing `README`
are preferred when more than one candidate exists. Common variables are mapped to stable names
such as `precipitation_mm`, `temperature_c`, and `wind_speed_ms`. Unknown variables are retained
with normalized names rather than discarded.

When a station README documents multiple dated formats, the processor selects the schema with
the most recent start date and skips source files older than that date. This keeps current rolling
products correct without interpreting legacy columns using a newer layout. Fraction-based soil
moisture fields are converted to percent so all `soil_moisture_*_pct` outputs use consistent units.

## Operational notes

- Review `processing_report.json` after every run, especially after station instrumentation or
  README changes.
- Output is regenerated deterministically, so it can be built in a staging directory and then
  published to the web server.
- The utility keeps the last row when duplicate station timestamps are encountered and reports
  the duplicate count.
- Reports include `files_skipped_before_schema` when older-format files are intentionally omitted.
- Source values are preserved as text. The processor does not guess which numeric sentinels mean
  missing data and does not perform scientific quality control. The `-99.99` sentinel is preserved
  while applying documented unit conversions.

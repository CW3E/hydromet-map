# Bookmark Snapshot Tool

This sidecar tool opens saved Hydromet Map bookmark URLs in a headless browser and exports screenshots. It is intentionally separate from `src/` so it does not affect the app bundle.

## Setup

Install Playwright when you are ready to use the tool:

```bash
npm install -D playwright
npx playwright install chromium
```

## Input File

Create a JSON file with bookmark entries. The simplest format is an array of full bookmark URLs:

```json
[
  {
    "name": "example-map",
    "url": "http://localhost:5173/?prj=global",
    "map": true,
    "plot": true,
    "cropMap": true,
    "waitMs": 5000,
    "viewport": { "width": 1440, "height": 1000 }
  }
]
```

For batch processing, use `defaults` plus `snapshots`. The tool merges `defaults.params` with each snapshot's `params` and builds the URL automatically:

```json
{
  "defaults": {
    "baseUrl": "http://localhost:5173/",
    "params": {
      "prj": "b120",
      "bm": "flat",
      "proj": "mercator",
      "ter": "true",
      "c": "-119.2752,38.4483",
      "z": "4.85",
      "brg": "0.0",
      "pit": "0.0",
      "prod": "NRT",
      "ens": "Mean",
      "tm": "date",
      "lyr": "cnrfcRaster,cnrfcRegion,b120Basins"
    },
    "map": true,
    "plot": false,
    "cropMap": true,
    "waitMs": 5000,
    "viewport": { "width": 600, "height": 744 }
  },
  "snapshots": [
    {
      "name": "b120 monthly precipitation 2026-03-01",
      "params": {
        "var": "precipitationMonthly",
        "d": "2026-03-01",
        "dt": "2026-03-01T16:00"
      }
    },
    {
      "name": "b120 monthly temperature 2026-04-01",
      "params": {
        "var": "temperatureMonthly",
        "d": "2026-04-01",
        "dt": "2026-04-01T16:00"
      }
    }
  ]
}
```

If you supply variables and dates from the command line, the JSON file only needs `defaults`; the `snapshots` array can be omitted.

For plot snapshots, use explicit popup fields. The script looks up the feature in the specified owner layer, builds the app bookmark popup parameter, opens the active tab, and screenshots the active plot panel:

```json
{
  "defaults": {
    "baseUrl": "https://maps.reachhydro.org/",
    "params": {
      "prj": "b120",
      "bm": "flat",
      "proj": "mercator",
      "ter": "false",
      "c": "-119.2752,38.4483",
      "z": "4",
      "brg": "0.0",
      "pit": "0.0",
      "prod": "NRT",
      "ens": "Mean",
      "tm": "date",
      "d": "2026-03-01",
      "dt": "2026-03-01T16:00",
      "lyr": "b120Points"
    },
    "popupSelects": {
      "Update": "2026-04-14",
      "Post-Processing": "lstm_cdfm"
    },
    "map": false,
    "plot": true,
    "waitMs": 6000,
    "viewport": { "width": 1100, "height": 900 }
  },
  "snapshots": [
    {
      "name": "b120 AMF forecast",
      "ownerLayerId": "b120Points",
      "featureId": "AMF",
      "tab": "nrt-fcst"
    }
  ]
}
```

Supported automatic feature lookups:

- `b120Points`: `featureId` matches `Station_ID`.
- `yampaPoints`: `featureId` matches `station_id`.
- `cnrfcPoints`: `featureId` matches `ID`.

For other layers, provide explicit `longitude` and `latitude` with `ownerLayerId` and `featureId`.

Plot popup targeting is intentionally strict. The script verifies the restored popup feature id against the requested `featureId`. If bookmark restoration is slow, it clicks the exact projected feature coordinate rather than a broad map-center fallback, which avoids selecting a neighboring station when hit circles overlap.

Fields:

- `name`: Output filename stem.
- `url`: Full bookmark URL to open.
- `baseUrl`: Base app URL for batch mode.
- `params`: Query parameters to apply to the URL. In batch mode, snapshot params override default params.
- `ownerLayerId`: Layer that owns the popup feature, such as `b120Points`.
- `featureId`: Feature/station ID to find within `ownerLayerId`.
- `tab`: Active popup tab id to snapshot.
- `popupSelects`: Optional object mapping popup selector labels to option values, for example `{ "Update": "2026-04-14", "Post-Processing": "lstm_cdfm" }`.
- `longitude` / `latitude`: Optional explicit popup location. Required for owner layers without automatic lookup support.
- `map`: Export a full viewport map/app screenshot. Defaults to `true`.
- `plot`: Export the active popup tab plot/table if one exists. Defaults to `false`.
- `cropMap`: Optional map screenshot crop in pixels. Use `true` for the default app-UI crop (`top: 95`, `right: 76`, `bottom: 56`, `left: 10`) or provide `{ "top": 95, "right": 76, "bottom": 56, "left": 10 }`.
- `waitMs`: Extra wait time after the map canvas appears. Defaults to `5000`.
- `viewport`: Browser viewport size. Defaults to `1440 x 1000`.

CLI generation options:

- `--var` / `--variable`: Variable id to use. Accepts comma-separated values and can be repeated.
- `--start-date`: First generated date, in `YYYY-MM-DD`.
- `--end-date`: Last generated date, in `YYYY-MM-DD`.
- `--date-step`: `day`, `month`, or `year`. Defaults to `month`.
- `--time`: Time used for generated `dt` values. Defaults to the time in `defaults.params.dt`, or `16:00`.
- `--owner-layer-id` / `--owner`: Owner layer id for generated plot snapshots.
- `--feature-id` / `--station-id` / `--station`: Feature/station id for generated plot snapshots. Accepts comma-separated values and can be repeated.
- `--tab`: Active popup tab id for generated plot snapshots. Accepts comma-separated values and can be repeated.
- `--popup-select`: Generic popup selector override in `label=value` form. Can be repeated.
- `--forecast-update`: Shortcut for `--popup-select Update=<value>`.
- `--post-processing`: Shortcut for `--popup-select Post-Processing=<value>`.

## Run

Start the app separately, for example:

```bash
npm run dev
```

Then run:

```bash
npm run snapshots -- --input tools/snapshots/map.example.json --output tools/snapshots/output
```

You can also generate variable/date combinations from the command line while reusing the shared map view, layer visibility, crop, and viewport settings in `defaults`:

```bash
npm run snapshots -- --input tools/snapshots/map.example.json --var precipitationMonthly --start-date 2026-03-01 --end-date 2026-05-01
```

Use comma-separated variables or repeat `--var`:

```bash
npm run snapshots -- --input tools/snapshots/map.example.json --var precipitationMonthly,temperatureMonthly --start-date 2026-03-01 --end-date 2026-05-01
```

By default, generated dates step by month. You can change this:

```bash
npm run snapshots -- --input tools/snapshots/map.example.json --var precipitationDaily --start-date 2026-03-01 --end-date 2026-03-07 --date-step day
```

Generated snapshots set `d=YYYY-MM-DD` and `dt=YYYY-MM-DDT16:00` by default. To use a different time:

```bash
npm run snapshots -- --input tools/snapshots/map.example.json --var precipitationDaily --start-date 2026-03-01 --end-date 2026-03-07 --date-step day --time 12:00
```

For plot snapshots, the popup target can also be supplied from the command line:

```bash
npm run snapshots -- --input tools/snapshots/plot.example.json --owner-layer-id b120Points --feature-id AMF --tab nrt-fcst
```

Specify popup selector values from the command line:

```bash
npm run snapshots -- --input tools/snapshots/plot.example.json --owner-layer-id b120Points --feature-id AMF --tab nrt-fcst --forecast-update 2026-04-14 --post-processing lstm_cdfm
```

You can pass multiple stations or tabs:

```bash
npm run snapshots -- --input tools/snapshots/plot.example.json --owner-layer-id b120Points --feature-id AMF,CSN --tab nrt-fcst,forecast-table
```

The tool writes files like:

```text
tools/snapshots/output/example-map-map.png
tools/snapshots/output/example-map-plot.png
```

If a bookmark has no popup or no active plot/table panel, the plot screenshot is skipped gracefully.

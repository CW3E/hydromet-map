# Popups

## Overview

The app has four popup feature families:

- forecast/CNRFC points
- snow stations
- B120 points
- Yampa points
- global reaches

These live under `src/features/` and follow a config + data + component structure.

## Shared pattern

Most popup features are split into:

- config:
  static tab/plot/source/series definitions
- data:
  fetch remote CSV/JSON and build plot state
- component:
  render popup UI and tabs

Most popup families now also support tab-level CSV export through a shared header download button.

Current CSV export behavior:

- time series tabs usually export raw source files, one file per configured source
- table tabs can export the displayed table as a generated CSV
- some plot types, such as choropleth tabs, may intentionally disable CSV export
- `.csv.gz` source downloads are decompressed to `.csv` in supported browsers
- export file names are configured per plot through `csvDownload.fileName(...)`

## Forecast point popup

Files:

- [src/features/cnrfcPointPopup/cnrfcPointPopupConfig.js](../src/features/cnrfcPointPopup/cnrfcPointPopupConfig.js)
- [src/features/cnrfcPointPopup/cnrfcPointPopupData.js](../src/features/cnrfcPointPopup/cnrfcPointPopupData.js)
- [src/features/cnrfcPointPopup/CnrfcPointPopup.jsx](../src/features/cnrfcPointPopup/CnrfcPointPopup.jsx)
- [src/features/cnrfcPointPopup/TimeSeriesPlot.jsx](../src/features/cnrfcPointPopup/TimeSeriesPlot.jsx)

Characteristics:

- multiple tabs
- forecast product selector
- time series only
- shared `TimeSeriesPlot`
- CSV download button exports raw source CSVs used by the active tab

## Snow station popup

Files:

- [src/features/snowStationPopup/snowStationPopupConfig.js](../src/features/snowStationPopup/snowStationPopupConfig.js)
- [src/features/snowStationPopup/snowStationPopupData.js](../src/features/snowStationPopup/snowStationPopupData.js)
- [src/features/snowStationPopup/SnowStationPopup.jsx](../src/features/snowStationPopup/SnowStationPopup.jsx)

Characteristics:

- two tabs per popup definition
- shared structure for snow pillows and snow courses
- can include transformed climatology/stat CSV data
- CSV download button exports raw source CSVs used by the active tab

## B120 point popup

Files:

- [src/features/b120PointPopup/b120PointPopupConfig.js](../src/features/b120PointPopup/b120PointPopupConfig.js)
- [src/features/b120PointPopup/b120PointPopupData.js](../src/features/b120PointPopup/b120PointPopupData.js)
- [src/features/b120PointPopup/B120PointPopup.jsx](../src/features/b120PointPopup/B120PointPopup.jsx)
- [src/features/b120PointPopup/B120PointPopupTable.jsx](../src/features/b120PointPopup/B120PointPopupTable.jsx)

Characteristics:

- multi-tab popup
- supports timeseries, table, and choropleth-style plot states
- supports forecast update selector and post-processing selector
- time series tabs export raw source CSVs
- table tabs export the rendered table as CSV
- choropleth tabs currently keep CSV export disabled

## Yampa point popup

Files:

- [src/features/yampaPointPopup/yampaPointPopupConfig.js](../src/features/yampaPointPopup/yampaPointPopupConfig.js)
- [src/features/yampaPointPopup/yampaPointPopupData.js](../src/features/yampaPointPopup/yampaPointPopupData.js)
- [src/features/yampaPointPopup/YampaPointPopup.jsx](../src/features/yampaPointPopup/YampaPointPopup.jsx)
- [src/features/yampaPointPopup/YampaPointPopupTable.jsx](../src/features/yampaPointPopup/YampaPointPopupTable.jsx)

Characteristics:

- cloned from the B120 popup pattern, but trimmed for Yampa needs
- supports timeseries and table plots
- no summary-map tab
- forecast update selector is populated from the Yampa `tupdates` JSON feed
- post-processing selector offers `cdfm` and `simulated`
- monthly flow displays use `af` instead of `taf`
- time series tabs export raw source CSVs
- table tabs export the rendered table as CSV

## Global reach popup

Files:

- [src/features/globalReachPopup/globalReachPopupConfig.js](../src/features/globalReachPopup/globalReachPopupConfig.js)
- [src/features/globalReachPopup/globalReachPopupData.js](../src/features/globalReachPopup/globalReachPopupData.js)
- [src/features/globalReachPopup/GlobalReachPopup.jsx](../src/features/globalReachPopup/GlobalReachPopup.jsx)
- [src/lib/gradesBinaryData.js](../src/lib/gradesBinaryData.js)
- [src/lib/plotDataSources.js](../src/lib/plotDataSources.js)

Characteristics:

- shared by `GRADES-hydroDL` and `SWORD Reaches`
- uses binary range requests instead of CSV-only loading
- supports recent-window plotting plus full-history plotting
- can attach calendar-year climatology percentiles for `GRADES-hydroDL`
- `SWORD Reaches` currently exposes only the `Full History` tab
- title text can be built from clicked-feature metadata such as COMID, reach ids, length, area, slope, and width
- rendered once from `MapCanvas.jsx`, while the line layers keep their own hover popups
- both `Recent 1 Year` and `Full History` can export generated CSV built from the normalized in-memory date/value rows
- for `GRADES-hydroDL`, climatology percentile columns are now named `Pctl5`, `Pctl10`, `Pctl20`, `Pctl50`, `Pctl80`, `Pctl90`, and `Pctl95`

## Plot types currently supported

The B120 and Yampa popup data builders currently support:

- `timeseries`
- `table`
- `choroplethmap`

Time series plots generally render through:

- `TimeSeriesPlot.jsx`

Non-timeseries B120 plots render through:

- `B120PointPopupTable.jsx`

## CSV export plumbing

Shared CSV export helpers live in:

- [src/lib/csvExport.js](../src/lib/csvExport.js)
- [src/components/PopupCsvDownloadButton.jsx](../src/components/PopupCsvDownloadButton.jsx)

Typical plot-level config looks like:

```js
csvDownload: {
  enabled: true,
  fileName: ({ station, popupState, sourceId, defaultFileName }) => {
    return `my_prefix_${station.stationId}_${sourceId}.csv`
  },
}
```

This is intentionally flexible so each popup family can include or omit things like:

- project/domain name
- station id
- source id
- forecast update date
- post-processing method
- fallback original filename

## Guidance

If a new layer needs a non-trivial popup:

1. create a feature folder in `src/features/`
2. keep popup config separate from popup data loading
3. keep layer click handling in the layer module
4. keep remote URL building and trace config in the popup feature module
5. if CSV export is needed, define it per plot through `csvDownload`

For shared popup UIs used by multiple layers, it is reasonable to render the popup once from `MapCanvas.jsx` and let layers only populate `selectedStation`.

That keeps layer modules smaller and makes popup logic reusable.

## Map tool dialogs

The context-menu map tools use a similar "shared rendering from `MapCanvas.jsx`" idea, but they are not feature popups.

Instead, they render through:

- [src/components/map/MapToolDialogs.jsx](../src/components/map/MapToolDialogs.jsx)

These dialogs are used for:

- watershed GeoJSON results
- upstream rivers GeoJSON results
- downstream flowpath GeoJSON results
- the combined `All 3 above!` tool

They support:

- success/error/loading states
- optional GeoJSON download before adding to the map
- shared location reporting based on the clicked map coordinate

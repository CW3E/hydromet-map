# Popups

## Overview

The app has three popup feature families:

- forecast/CNRFC points
- snow stations
- B120 points

These live under `src/features/` and follow a config + data + component structure.

## Shared pattern

Most popup features are split into:

- config:
  static tab/plot/source/series definitions
- data:
  fetch remote CSV/JSON and build plot state
- component:
  render popup UI and tabs

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

## Snow station popup

Files:

- [src/features/snowStationPopup/snowStationPopupConfig.js](../src/features/snowStationPopup/snowStationPopupConfig.js)
- [src/features/snowStationPopup/snowStationPopupData.js](../src/features/snowStationPopup/snowStationPopupData.js)
- [src/features/snowStationPopup/SnowStationPopup.jsx](../src/features/snowStationPopup/SnowStationPopup.jsx)

Characteristics:

- two tabs per popup definition
- shared structure for snow pillows and snow courses
- can include transformed climatology/stat CSV data

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

## Plot types currently supported

The B120 popup data builder currently supports:

- `timeseries`
- `table`
- `choroplethmap`

Time series plots generally render through:

- `TimeSeriesPlot.jsx`

Non-timeseries B120 plots render through:

- `B120PointPopupTable.jsx`

## Guidance

If a new layer needs a non-trivial popup:

1. create a feature folder in `src/features/`
2. keep popup config separate from popup data loading
3. keep layer click handling in the layer module
4. keep remote URL building and trace config in the popup feature module

That keeps layer modules smaller and makes popup logic reusable.

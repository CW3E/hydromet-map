# AGENTS.md

## Project Goals
- Create a web map
  - Can display various types of hydrometeorological data like vectors, vector tiles, raster (PNG) overlays, raster tiles, and so on
  - Allow users to turn on and off map layers
  - Allow users to select between different basemap layers predefined in JSON style files
  - Allow users to turn on/off terrain (if available in the basemap) and switch between globe and mecator projections
- For the raster (PNG) overlay layer
  - Allow users to select the source, which can be raster maps for different variables, different dates, different products, and different ensemble traces
  - Build UI's for raster selection, for example, dropdowns (for variables, products, ensemble traces), datepicker and day/month forward/backward buttons (for dates)
  - Display a predefined colormap (list of values and colors) for the variable being shown on the map and change it accordingly when the user changes the variable
- Bookmark the map
  - Bookmark any map view: record map view (center, zoom, bearing, pitch, basemap style, terrain on/off status, globe/mecator projection), layers on/off status, and raster data source (variable/date/product/ensemble) in an loadable URL (for example, copy it to clipboard and generate a QR code) and allow users to load the map view from it
- Display time series data upon feature click
  - Fetch remote time series data (in CSV format) according to the feature clicked
  - Display fetched time series data as interactive plots in a popup window
  - Multiple time series may need to be displayed - create tabs in the popup window for them
- Additional map gadgets
  - Display latitude/longitude of current mouse location
  - Map scale
- As friendly as possible for mobile devices

## Major Tools (currently planned and not necessarily the best choices)
- `react.js` for component building and state management
- `react-map-gl` and `maplibre-gl` for mapping
- `react-plotly.js` and `plotly.js` for interactive time series plots
- `MUI` or a similar library for consistent look of UI's
- `papaparse` or a similar library for parsing CSV data


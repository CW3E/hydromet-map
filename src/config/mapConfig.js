export const BASEMAPS = [
  {
    id: 'flat',
    label: 'Flat',
    description: 'Flat and minimalistic.',
    terrainAvailable: false,
  },
  {
    id: 'terrain',
    label: 'Terrain',
    description: 'Terrain enabled.',
    terrainAvailable: true,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Satellite imagery with terrain enabled.',
    terrainAvailable: true,
  },
]

export const MAP_LAYERS = [
  {
    id: 'forecast',
    label: 'Raster Overlay',
    type: 'png-overlay',
    description: 'Model raster rendered from a variable, date, and ensemble.',
    symbol: '\u25A0',
  },
  {
    id: 'cnrfcRegion',
    label: 'CNRFC Region',
    type: 'vector',
    description: 'CNRFC boundary outline.',
    symbol: '\u2610',
    symbolColor: '#6b7280',
  },
  {
    id: 'rivers',
    label: 'NWM Rivers',
    type: 'vector-tile',
    description: 'Flowlines and stream segments from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#008b8b',
  },
  {
    id: 'stations',
    label: 'Forecast Points',
    type: 'vector',
    description: 'Clickable station points for time-series lookups.',
    symbol: '\u25CF',
    symbolColor: '#2563eb',
  },
  {
    id: 'watersheds',
    label: 'Forecast Basins',
    type: 'vector-tile',
    description: 'Forecast basin boundaries from tiled vector sources.',
    symbol: '\u2610',
    symbolColor: '#2563eb',
  },
  {
    id: 'snowCourses',
    label: 'Snow Courses',
    type: 'vector',
    description: 'Snow course monitoring stations.',
    symbol: '\u25CF',
    symbolColor: '#8b4513',
  },
  {
    id: 'snowPillows',
    label: 'Snow Pillows',
    type: 'vector',
    description: 'Snow pillow monitoring stations.',
    symbol: '\u25CF',
    symbolColor: '#ff8c00',
  },
]

export const RASTER_VARIABLES = {
  precipitation: {
    label: 'Precipitation',
    units: 'mm',
    timestep: '3hour',
    palette: {
      thresholds: ['1', '2.5', '5', '7.5', '10', '15', '20', '30', '40', '50', '70', '100', '150', '200', '250', '300', '400', '500', '750'],
      colors: ['#ebebeb', '#50d0d0', '#00ffff', '#00e080', '#00c000', '#80e000', '#ffff00', '#ffa000', '#ff0000', '#ff2080', '#f040ff',
        '#8020ff', '#4040ff', '#202080', '#202020', '#808080', '#e0e0e0', '#eed4bc', '#daa678', '#663300'],
    },
  },
  temperature: {
    label: 'Temperature',
    units: '\u00B0 C',
    timestep: '1day',
    palette: {
      thresholds: ['-12', '-9', '-6', '-3', '0', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '33', '36', '39'],
      colors: ['#7f00ff', '#612efd', '#435cfa', '#2586f5', '#07abed', '#16cbe4', '#34e4d8', '#52f5cb', '#70fdbc', '#8efdab',
        '#acf599', '#cae486', '#e8cb71', '#ffab5c', '#ff8645', '#ff5c2e', '#ff2e17', '#ff0000'],
    },
  },
  wind: {
    label: 'Wind Gust',
    units: 'm/s',
    timestep: '1hour',
    palette: {
      thresholds: ['8', '15', '22', '30'],
      colors: ['#f0fdf4', '#86efac', '#22c55e', '#15803d', '#14532d'],
    },
  },
}

export const RASTER_MODELS = ['GFS', 'ECMWF', 'WRF']
export const ENSEMBLE_TRACES = ['Control', 'Mean', 'P10', 'P50', 'P90']
export const DEFAULT_DATE = '2026-04-13'
export const DEFAULT_DATETIME = '2026-04-13T12:00'
export const TERRAIN_SOURCE_ID = 'terrain_source'
export const TERRAIN_SPEC = { source: TERRAIN_SOURCE_ID, exaggeration: 1 }
export const RIVER_NETWORK_PMTILES_URL =
  'https://cw3e.ucsd.edu/wrf_hydro/cnrfc/pmtiles/nwm_reaches_cnrfc_idx.pmtiles'
export const RIVER_NETWORK_SOURCE_LAYER = 'NWM_v2.1_channels'
export const FORECAST_BASINS_PMTILES_URL =
  'https://cw3e.ucsd.edu/wrf_hydro/cnrfc/pmtiles/CNRFC_Basins.pmtiles'
export const FORECAST_BASINS_SOURCE_LAYER = 'CNRFC_Basins'

export const DEFAULT_STATE = {
  view: {
    center: '-120.50,37.20',
    zoom: '5.8',
    bearing: '0',
    pitch: '30',
  },
  basemapId: 'flat',
  terrainEnabled: true,
  projection: 'mercator',
  layers: {
    watersheds: true,
    rivers: true,
    stations: true,
    cnrfcRegion: true,
    snowCourses: false,
    snowPillows: false,
    forecast: true,
  },
  raster: {
    variable: 'precipitation',
    model: 'GFS',
    ensemble: 'Mean',
    temporalMode: 'date',
    date: DEFAULT_DATE,
    datetime: DEFAULT_DATETIME,
  },
}

export const BASEMAP_STYLES = {
  flat: 'https://cw3e.ucsd.edu/hydro/styles/positron.json',
  terrain: 'https://cw3e.ucsd.edu/hydro/styles/terrain_maptiler.json',
  satellite: 'https://cw3e.ucsd.edu/hydro/styles/satellite_maptiler.json',
}

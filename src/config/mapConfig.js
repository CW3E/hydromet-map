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
    id: 'rivers',
    label: 'NWM Rivers',
    type: 'vector-tile',
    description: 'Flowlines and stream segments from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#008b8b',
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
    palette: [
      { value: '0', color: '#f7fbff' },
      { value: '5', color: '#cfe1f2' },
      { value: '15', color: '#73a9cf' },
      { value: '30', color: '#1d6996' },
      { value: '50+', color: '#0f3557' },
    ],
  },
  temperature: {
    label: 'Temperature',
    units: 'deg C',
    timestep: '1day',
    palette: [
      { value: '-10', color: '#2b6cb0' },
      { value: '0', color: '#90cdf4' },
      { value: '10', color: '#fef08a' },
      { value: '20', color: '#fb923c' },
      { value: '30+', color: '#c2410c' },
    ],
  },
  wind: {
    label: 'Wind Gust',
    units: 'm/s',
    timestep: '1hour',
    palette: [
      { value: '0', color: '#f0fdf4' },
      { value: '8', color: '#86efac' },
      { value: '15', color: '#22c55e' },
      { value: '22', color: '#15803d' },
      { value: '30+', color: '#14532d' },
    ],
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

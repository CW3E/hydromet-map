function buildSoilMoistureDailyRasterUrl({ date }) {
  if (!date) {
    return null
  }

  const yyyymmdd = date.replaceAll('-', '')

  if (yyyymmdd.length !== 8) {
    return null
  }

  const yyyy = yyyymmdd.slice(0, 4)
  return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/nrt/output/${yyyy}/smtot_r_${yyyymmdd}.png`
}

function buildSweDailyRasterUrl({ date }) {
  if (!date) {
    return null
  }

  const yyyymmdd = date.replaceAll('-', '')

  if (yyyymmdd.length !== 8) {
    return null
  }

  const yyyy = yyyymmdd.slice(0, 4)
  return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/nrt/output/${yyyy}/swe_r_${yyyymmdd}.png`
}

function buildPrecipitationDailyRasterUrl({ date }) {
  if (!date) {
    return null
  }

  const yyyymmdd = date.replaceAll('-', '')

  if (yyyymmdd.length !== 8) {
    return null
  }

  const yyyy = yyyymmdd.slice(0, 4)
  return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/nrt/forcing/${yyyy}/precip_${yyyymmdd}.png`
}

function buildTemperatureDailyRasterUrl({ date }) {
  if (!date) {
    return null
  }

  const yyyymmdd = date.replaceAll('-', '')

  if (yyyymmdd.length !== 8) {
    return null
  }

  const yyyy = yyyymmdd.slice(0, 4)
  return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/nrt/forcing/${yyyy}/tair2m_${yyyymmdd}.png`
}

function buildPrecipitationMonthlyRasterUrl({ date }) {
  if (!date) {
    return null
  }

  const yyyymmdd = date.replaceAll('-', '')

  if (yyyymmdd.length !== 8) {
    return null
  }

  const yyyy = yyyymmdd.slice(0, 4)
  const yyyymm = yyyymmdd.slice(0, 6)
  return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/nrt/forcing/${yyyy}/precip_r_${yyyymm}.png`
}

function buildTemperatureMonthlyRasterUrl({ date }) {
  if (!date) {
    return null
  }

  const yyyymmdd = date.replaceAll('-', '')

  if (yyyymmdd.length !== 8) {
    return null
  }

  const yyyy = yyyymmdd.slice(0, 4)
  const yyyymm = yyyymmdd.slice(0, 6)
  return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/nrt/forcing/${yyyy}/tair2m_r_${yyyymm}.png`
}

function buildWind3HourlyRasterUrl({ datetime }) {
  if (!datetime) {
    return null
  }

  const normalizedDateTime = datetime.replaceAll('-', '').replace('T', '').replaceAll(':', '')

  if (normalizedDateTime.length !== 12) {
    return null
  }

  const yyyymmddhh = normalizedDateTime.slice(0, 10)
  const yyyy = normalizedDateTime.slice(0, 4)
  return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/nrt/output/${yyyy}/wind_r_${yyyymmddhh}.png`
}

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
    id: 'raster',
    label: 'Raster Overlay',
    type: 'png-overlay',
    description: 'Raster rendered from a variable, date, product, and ensemble.',
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
  soilMoistureDaily: {
    label: 'Daily SM %-ile',
    units: '%-ile',
    timestep: '1day',
    buildRasterUrl: buildSoilMoistureDailyRasterUrl,
    palette: {
      thresholds: ['2', '5', '10', '20', '30', '70', '80', '90', '95', '98'],
      colors: ['#730000', '#e60000', '#e69800', '#fed37f', '#fefe00',
        '#ffffff', '#aaf596', '#4ce600', '#38a800', '#145a00',
        '#002673'],
    },
  },
  sweDaily: {
    label: 'Daily SWE %-ile',
    units: '%-ile',
    timestep: '1day',
    buildRasterUrl: buildSweDailyRasterUrl,
    palette: {
      thresholds: ['1', '5', '10', '20', '30', '70', '80', '90', '95', '99'],
      colors: ['#b40000', '#ff2e2e', '#ff5d5d', '#ff8b8b', '#ffb9b9',
        '#ffe85d', '#d7d7ff', '#b9b9ff', '#8b8bff', '#5d5dff',
        '#2e2eb4'],
    },
  },
  precipitationDaily: {
    label: 'Daily P',
    units: 'mm',
    timestep: '1day',
    buildRasterUrl: buildPrecipitationDailyRasterUrl,
    palette: {
      thresholds: ['1', '2.5', '5', '7.5', '10', '15', '20', '30', '40', '50', '70', '100', '150', '200', '250', '300', '400', '500', '750'],
      colors: ['#ebebeb', '#50d0d0', '#00ffff', '#00e080', '#00c000', '#80e000', '#ffff00', '#ffa000', '#ff0000', '#ff2080', '#f040ff',
        '#8020ff', '#4040ff', '#202080', '#202020', '#808080', '#e0e0e0', '#eed4bc', '#daa678', '#663300'],
    },
  },
  temperatureDaily: {
    label: 'Daily T',
    units: '\u00B0C',
    timestep: '1day',
    buildRasterUrl: buildTemperatureDailyRasterUrl,
    palette: {
      thresholds: ['-12', '-9', '-6', '-3', '0', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '33', '36', '39'],
      colors: ['#7f00ff', '#612efd', '#435cfa', '#2586f5', '#07abed', '#16cbe4', '#34e4d8', '#52f5cb', '#70fdbc', '#8efdab',
        '#acf599', '#cae486', '#e8cb71', '#ffab5c', '#ff8645', '#ff5c2e', '#ff2e17', '#ff0000'],
    },
  },
  precipitationMonthly: {
    label: 'Monthly P %-ile',
    units: '%-ile',
    timestep: '1month',
    buildRasterUrl: buildPrecipitationMonthlyRasterUrl,
    palette: {
      thresholds: ['1', '5', '10', '20', '35', '65', '80', '90', '95', '99'],
      colors: ['#7f3b08', '#ad5506', '#d77911', '#f4a84b', '#fdd198',
        '#ffffff', '#e9e9f1', '#cac9e2', '#a39ac6', '#7764a4',
        '#502382'],
    },
  },
  temperatureMonthly: {
    label: 'Monthly T %-ile',
    units: '%-ile',
    timestep: '1month',
    buildRasterUrl: buildTemperatureMonthlyRasterUrl,
    palette: {
      thresholds: ['1', '5', '10', '20', '35', '65', '80', '90', '95', '99'],
      colors: ['#3a4cc0', '#5673e0', '#7497f5', '#94b5fe', '#b4cdfa',
        '#ffffff', '#e7d6cc', '#f5c1a8', '#f5a182', '#ea7b60',
        '#d34d40'],
    },
  },
  wind3Hourly: {
    label: 'Wind Speed',
    units: 'm/s',
    timestep: '3hour',
    buildRasterUrl: buildWind3HourlyRasterUrl,
    palette: {
      thresholds: ['8', '15', '22', '30'],
      colors: ['#f0fdf4', '#86efac', '#22c55e', '#15803d', '#14532d'],
    },
  },
}

export const DEFAULT_RASTER_VARIABLE = Object.keys(RASTER_VARIABLES)[0]
export const RASTER_PRODUCTS = ['NRT', 'WWRF-ECMWF', 'WWRF-GFS','GFS']
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
    center: '-119,38.1',
    zoom: '5.3',
    bearing: '0',
    pitch: '0',
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
    raster: true,
  },
  raster: {
    variable: DEFAULT_RASTER_VARIABLE,
    product: RASTER_PRODUCTS[0],
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

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

export const ALL_MAP_LAYERS = [
  {
    id: 'cnrfcRaster',
    label: 'CNRFC Rasters',
    type: 'png-overlay',
    description: 'Raster rendered from a variable, date, product, and ensemble.',
    symbol: '\u25A0',
  },
  {
    id: 'ucrbRaster',
    label: 'UCRB Rasters',
    type: 'png-overlay',
    description: 'UCRB raster overlay rendered from a variable, date, and product.',
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
    id: 'ucrbRegion',
    label: 'UCRB Region',
    type: 'vector',
    description: 'UCRB boundary outline.',
    symbol: '\u2610',
    symbolColor: '#6b7280',
  },
  {
    id: 'yampaRegion',
    label: 'Yampa Region',
    type: 'vector',
    description: 'Yampa boundary outline.',
    symbol: '\u2610',
    symbolColor: '#0b3b8f',
  },
  {
    id: 'yampaPoints',
    label: 'Yampa Points',
    type: 'vector',
    description: 'Yampa-region point locations from GeoJSON sources.',
    symbol: '\u25CF',
    symbolColor: '#00ffff',
  },
  {
    id: 'cnrfcRivers',
    label: 'NWM Rivers (CNRFC)',
    type: 'vector-tile',
    description: 'CNRFC-region flowlines and stream segments from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#008b8b',
  },
  {
    id: 'ucrbRivers',
    label: 'NWM Rivers (UCRB)',
    type: 'vector-tile',
    description: 'UCRB-region flowlines and stream segments from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#008b8b',
  },
  {
    id: 'gradesHydroDl',
    label: 'GRADES-hydroDL (v2.0)',
    type: 'vector-tile',
    description: 'Global GRADES-hydroDL flowlines from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#8b5cf6',
  },
  {
    id: 'meritBasins',
    label: 'MERIT Basins (v1.0)',
    type: 'vector-tile',
    description: 'Global MERIT Hydro basin flowlines from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#00ced1',
  },
  {
    id: 'cnrfcBasins',
    label: 'CNRFC Basins',
    type: 'vector-tile',
    description: 'CNRFC basin boundaries from tiled vector sources.',
    symbol: '\u2610',
    symbolColor: '#2563eb',
  },
  {
    id: 'cnrfcPoints',
    label: 'CNRFC Points',
    type: 'vector',
    description: 'Clickable CNRFC-region point locations for time-series lookups.',
    symbol: '\u25CF',
    symbolColor: '#2563eb',
  },
  {
    id: 'b120Basins',
    label: 'B120 Basins',
    type: 'vector',
    description: 'B120 basin polygons from GeoJSON sources.',
    symbol: '\u2610',
    symbolColor: '#0b3b8f',
  },
  {
    id: 'b120Points',
    label: 'B120 Points',
    type: 'vector',
    description: 'B120-region point locations from GeoJSON sources.',
    symbol: '\u25CF',
    symbolColor: '#00ffff',
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

export const MAP_LAYERS = ALL_MAP_LAYERS

export const DEFAULT_RASTER_COORDINATES = [
  [-125, 44],
  [-113, 44],
  [-113, 32],
  [-125, 32],
]

export const UCRB_RASTER_COORDINATES = [
  [-113, 45],
  [-104, 45],
  [-104, 34],
  [-113, 34],
]

export function getRasterProductPath(product) {
  switch (product) {
    case 'WWRF-ECMWF':
      return 'fcst/wwrf_ecmwf'
    case 'WWRF-GFS':
      return 'fcst/wwrf_gfs'
    case 'GFS':
      return 'fcst/gfs'
    case 'NRT':
    default:
      return 'nrt'
  }
}

function replaceRasterDomain(url, domain) {
  if (!url) {
    return url
  }

  return url.replace('/hydro/cnrfc/', `/hydro/${domain}/`)
}

function cloneRasterVariablesForDomain(variables, { coordinates, domain }) {
  return Object.fromEntries(
    Object.entries(variables).map(([variableId, variableDefinition]) => [
      variableId,
      {
        ...variableDefinition,
        coordinates,
        buildRasterUrl: variableDefinition.buildRasterUrl
          ? (rasterState) => replaceRasterDomain(variableDefinition.buildRasterUrl(rasterState), domain)
          : undefined,
      },
    ]),
  )
}

export const CNRFC_RASTER_VARIABLES = {
  soilMoistureDaily: {
    label: 'Daily SM %-ile',
    units: '%-ile',
    timestep: '1day',
    coordinates: DEFAULT_RASTER_COORDINATES,
    palette: {
      thresholds: ['2', '5', '10', '20', '30', '70', '80', '90', '95', '98'],
      colors: [
        '#730000',
        '#e60000',
        '#e69800',
        '#fed37f',
        '#fefe00',
        '#ffffff',
        '#aaf596',
        '#4ce600',
        '#38a800',
        '#145a00',
        '#002673',
      ],
    },
    buildRasterUrl: ({ date, product }) => {
      if (!date) {
        return null
      }

      const yyyymmdd = date.replaceAll('-', '')

      if (yyyymmdd.length !== 8) {
        return null
      }

      const yyyy = yyyymmdd.slice(0, 4)
      return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/${getRasterProductPath(product)}/output/${yyyy}/smtot_r_${yyyymmdd}.png`
    },
  },
  sweDaily: {
    label: 'Daily SWE %-ile',
    units: '%-ile',
    timestep: '1day',
    coordinates: DEFAULT_RASTER_COORDINATES,
    palette: {
      thresholds: ['1', '5', '10', '20', '30', '70', '80', '90', '95', '99'],
      colors: [
        '#b40000',
        '#ff2e2e',
        '#ff5d5d',
        '#ff8b8b',
        '#ffb9b9',
        '#ffe85d',
        '#d7d7ff',
        '#b9b9ff',
        '#8b8bff',
        '#5d5dff',
        '#2e2eb4',
      ],
    },
    buildRasterUrl: ({ date, product }) => {
      if (!date) {
        return null
      }

      const yyyymmdd = date.replaceAll('-', '')

      if (yyyymmdd.length !== 8) {
        return null
      }

      const yyyy = yyyymmdd.slice(0, 4)
      return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/${getRasterProductPath(product)}/output/${yyyy}/swe_r_${yyyymmdd}.png`
    },
  },
  precipitationDaily: {
    label: 'Daily P',
    units: 'mm',
    timestep: '1day',
    coordinates: DEFAULT_RASTER_COORDINATES,
    palette: {
      thresholds: ['1', '2.5', '5', '7.5', '10', '15', '20', '30', '40', '50', '70', '100', '150', '200', '250', '300', '400', '500', '750'],
      colors: [
        '#ebebeb',
        '#50d0d0',
        '#00ffff',
        '#00e080',
        '#00c000',
        '#80e000',
        '#ffff00',
        '#ffa000',
        '#ff0000',
        '#ff2080',
        '#f040ff',
        '#8020ff',
        '#4040ff',
        '#202080',
        '#202020',
        '#808080',
        '#e0e0e0',
        '#eed4bc',
        '#daa678',
        '#663300',
      ],
    },
    buildRasterUrl: ({ date, product }) => {
      if (!date) {
        return null
      }

      const yyyymmdd = date.replaceAll('-', '')

      if (yyyymmdd.length !== 8) {
        return null
      }

      const yyyy = yyyymmdd.slice(0, 4)
      return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/${getRasterProductPath(product)}/forcing/${yyyy}/precip_${yyyymmdd}.png`
    },
  },
  temperatureDaily: {
    label: 'Daily T',
    units: '\u00B0C',
    timestep: '1day',
    coordinates: DEFAULT_RASTER_COORDINATES,
    palette: {
      thresholds: ['-12', '-9', '-6', '-3', '0', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '33', '36', '39'],
      colors: [
        '#7f00ff',
        '#612efd',
        '#435cfa',
        '#2586f5',
        '#07abed',
        '#16cbe4',
        '#34e4d8',
        '#52f5cb',
        '#70fdbc',
        '#8efdab',
        '#acf599',
        '#cae486',
        '#e8cb71',
        '#ffab5c',
        '#ff8645',
        '#ff5c2e',
        '#ff2e17',
        '#ff0000',
      ],
    },
    buildRasterUrl: ({ date, product }) => {
      if (!date) {
        return null
      }

      const yyyymmdd = date.replaceAll('-', '')

      if (yyyymmdd.length !== 8) {
        return null
      }

      const yyyy = yyyymmdd.slice(0, 4)
      return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/${getRasterProductPath(product)}/forcing/${yyyy}/tair2m_${yyyymmdd}.png`
    },
  },
  precipitationMonthly: {
    label: 'Monthly P %-ile',
    units: '%-ile',
    timestep: '1month',
    coordinates: DEFAULT_RASTER_COORDINATES,
    palette: {
      thresholds: ['1', '5', '10', '20', '35', '65', '80', '90', '95', '99'],
      colors: [
        '#7f3b08',
        '#ad5506',
        '#d77911',
        '#f4a84b',
        '#fdd198',
        '#ffffff',
        '#e9e9f1',
        '#cac9e2',
        '#a39ac6',
        '#7764a4',
        '#502382',
      ],
    },
    buildRasterUrl: ({ date, product }) => {
      if (!date) {
        return null
      }

      const yyyymmdd = date.replaceAll('-', '')

      if (yyyymmdd.length !== 8) {
        return null
      }

      const yyyy = yyyymmdd.slice(0, 4)
      const yyyymm = yyyymmdd.slice(0, 6)
      return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/${getRasterProductPath(product)}/forcing/${yyyy}/precip_r_${yyyymm}.png`
    },
  },
  temperatureMonthly: {
    label: 'Monthly T %-ile',
    units: '%-ile',
    timestep: '1month',
    coordinates: DEFAULT_RASTER_COORDINATES,
    palette: {
      thresholds: ['1', '5', '10', '20', '35', '65', '80', '90', '95', '99'],
      colors: [
        '#3a4cc0',
        '#5673e0',
        '#7497f5',
        '#94b5fe',
        '#b4cdfa',
        '#ffffff',
        '#e7d6cc',
        '#f5c1a8',
        '#f5a182',
        '#ea7b60',
        '#d34d40',
      ],
    },
    buildRasterUrl: ({ date, product }) => {
      if (!date) {
        return null
      }

      const yyyymmdd = date.replaceAll('-', '')

      if (yyyymmdd.length !== 8) {
        return null
      }

      const yyyy = yyyymmdd.slice(0, 4)
      const yyyymm = yyyymmdd.slice(0, 6)
      return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/${getRasterProductPath(product)}/forcing/${yyyy}/tair2m_r_${yyyymm}.png`
    },
  },
  wind3Hourly: {
    label: 'Wind Speed',
    units: 'm/s',
    timestep: '3hour',
    coordinates: DEFAULT_RASTER_COORDINATES,
    palette: {
      thresholds: ['8', '15', '22', '30'],
      colors: ['#f0fdf4', '#86efac', '#22c55e', '#15803d', '#14532d'],
    },
    buildRasterUrl: ({ datetime, product }) => {
      if (!datetime) {
        return null
      }

      const normalizedDateTime = datetime
        .replaceAll('-', '')
        .replace('T', '')
        .replaceAll(':', '')

      if (normalizedDateTime.length !== 12) {
        return null
      }

      const yyyymmddhh = normalizedDateTime.slice(0, 10)
      const yyyy = normalizedDateTime.slice(0, 4)
      return `https://cw3e.ucsd.edu/hydro/cnrfc/imgs/${getRasterProductPath(product)}/output/${yyyy}/wind_r_${yyyymmddhh}.png`
    },
  },
}

export const UCRB_RASTER_VARIABLES = cloneRasterVariablesForDomain(CNRFC_RASTER_VARIABLES, {
  coordinates: UCRB_RASTER_COORDINATES,
  domain: 'ucrb',
})

export const RASTER_FAMILIES = {
  cnrfc: {
    id: 'cnrfc',
    label: 'CNRFC Raster Overlay',
    layerId: 'cnrfcRaster',
    variables: CNRFC_RASTER_VARIABLES,
    products: ['NRT', 'WWRF-ECMWF', 'WWRF-GFS', 'GFS'],
    ensembleTraces: ['Control', 'Mean', 'P10', 'P50', 'P90'],
    statusUrl: 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/status.json',
    statusKey: 'WRF-Hydro NRT',
    defaultDate: '2026-04-13',
    defaultDateTime: '2026-04-13T12:00',
  },
  ucrb: {
    id: 'ucrb',
    label: 'UCRB Raster Overlay',
    layerId: 'ucrbRaster',
    variables: UCRB_RASTER_VARIABLES,
    products: ['NRT'],
    ensembleTraces: [],
    statusUrl: 'https://cw3e.ucsd.edu/hydro/ucrb/csv/status.json',
    statusKey: 'WRF-Hydro NRT',
    defaultDate: '2026-04-13',
    defaultDateTime: '2026-04-13T12:00',
  },
}

function buildDefaultRasterState(rasterFamily) {
  const variableIds = Object.keys(rasterFamily?.variables ?? {})
  const defaultVariable = variableIds[0] ?? ''

  return {
    variable: defaultVariable,
    product: rasterFamily?.products?.[0] ?? 'NRT',
    ensemble: rasterFamily?.ensembleTraces?.[1] ?? rasterFamily?.ensembleTraces?.[0] ?? '',
    temporalMode: 'date',
    date: rasterFamily?.defaultDate ?? '2026-04-13',
    datetime: rasterFamily?.defaultDateTime ?? '2026-04-13T12:00',
  }
}

function buildLayerState(visibleLayerIds = []) {
  const visibleLayerIdSet = new Set(visibleLayerIds)

  return Object.fromEntries(
    ALL_MAP_LAYERS.map((layer) => [layer.id, visibleLayerIdSet.has(layer.id)]),
  )
}

function buildDefaultProjectState(projectDefinition) {
  const rasterFamily = projectDefinition.rasterFamilyId
    ? RASTER_FAMILIES[projectDefinition.rasterFamilyId]
    : null
  const defaultRasterState = rasterFamily
    ? {
        ...buildDefaultRasterState(rasterFamily),
        ...(projectDefinition.defaultRaster ?? {}),
      }
    : null

  return {
    view: {
      center: projectDefinition.defaultView?.center ?? '-119,38.1',
      zoom: projectDefinition.defaultView?.zoom ?? '5.3',
      bearing: projectDefinition.defaultView?.bearing ?? '0',
      pitch: projectDefinition.defaultView?.pitch ?? '0',
    },
    basemapId: projectDefinition.defaultBasemapId ?? 'flat',
    terrainEnabled: projectDefinition.defaultTerrainEnabled ?? true,
    projection: projectDefinition.defaultProjection ?? 'mercator',
    layers: buildLayerState(projectDefinition.defaultVisibleLayerIds ?? []),
    raster: defaultRasterState,
  }
}

export const PROJECTS = {
  cnrfc: {
    id: 'cnrfc',
    label: 'CNRFC',
    rasterFamilyId: 'cnrfc',
    defaultRaster: {
      variable: 'soilMoistureDaily',
    },
    availableLayerIds: [
      'cnrfcRaster',
      'cnrfcRegion',
      'cnrfcRivers',
      'cnrfcBasins',
      'cnrfcPoints',
      'snowCourses',
      'snowPillows',
    ],
    defaultVisibleLayerIds: [
      'cnrfcRaster',
      'cnrfcRegion',
      'cnrfcRivers',
      'cnrfcBasins',
      'cnrfcPoints',
    ],
  },
  b120: {
    id: 'b120',
    label: 'B120',
    defaultView: {
      center: '-119,39',
      zoom: '5.6',
      bearing: '0',
      pitch: '0',
    },
    rasterFamilyId: 'cnrfc',
    defaultRaster: {
      variable: 'sweDaily',
    },
    availableLayerIds: [
      'cnrfcRaster',
      'cnrfcRegion',
      'cnrfcRivers',
      'b120Basins',
      'b120Points',
      'snowCourses',
      'snowPillows',
    ],
    defaultVisibleLayerIds: [
      'cnrfcRaster',
      'cnrfcRegion',
      'b120Basins',
      'b120Points',
      'snowCourses',
      'snowPillows',
    ],
  },
  yampa: {
    id: 'yampa',
    label: 'Yampa',
    rasterFamilyId: 'ucrb',
    defaultRaster: {
      variable: 'sweDaily',
    },
    defaultView: {
      center: '-108,39.8',
      zoom: '5.8',
      bearing: '0',
      pitch: '0',
    },
    availableLayerIds: ['ucrbRaster', 'ucrbRegion', 'ucrbRivers', 'yampaRegion', 'yampaPoints'],
    defaultVisibleLayerIds: ['ucrbRaster', 'ucrbRegion', 'ucrbRivers', 'yampaRegion', 'yampaPoints'],
  },
  global: {
    id: 'global',
    label: 'Global',
    defaultView: {
      center: '55,30',
      zoom: '2.8',
      bearing: '0',
      pitch: '0',
    },
    defaultBasemapId: 'terrain',
    defaultTerrainEnabled: false,
    defaultProjection: 'globe',
    availableLayerIds: ['gradesHydroDl', 'meritBasins'],
    defaultVisibleLayerIds: ['gradesHydroDl'],
  },
}

export const PROJECT_OPTIONS = Object.values(PROJECTS).map(({ id, label }) => ({ id, label }))
export const DEFAULT_PROJECT_ID = PROJECT_OPTIONS[0]?.id ?? 'cnrfc'

export function getProjectDefinition(projectId = DEFAULT_PROJECT_ID) {
  return PROJECTS[projectId] ?? PROJECTS[DEFAULT_PROJECT_ID]
}

export function getRasterFamilyDefinition(rasterFamilyId) {
  return rasterFamilyId ? RASTER_FAMILIES[rasterFamilyId] ?? null : null
}

export function getProjectRasterFamily(projectId = DEFAULT_PROJECT_ID) {
  const projectDefinition = getProjectDefinition(projectId)
  return getRasterFamilyDefinition(projectDefinition?.rasterFamilyId)
}

export function getProjectMapLayers(projectId = DEFAULT_PROJECT_ID) {
  const projectDefinition = getProjectDefinition(projectId)
  const layerById = Object.fromEntries(ALL_MAP_LAYERS.map((layer) => [layer.id, layer]))

  return (projectDefinition?.availableLayerIds ?? [])
    .map((layerId) => layerById[layerId])
    .filter(Boolean)
}

export function createProjectState(projectId = DEFAULT_PROJECT_ID) {
  return buildDefaultProjectState(getProjectDefinition(projectId))
}

export function createDefaultAppState() {
  return {
    activeProjectId: DEFAULT_PROJECT_ID,
    projectStateById: Object.fromEntries(
      Object.keys(PROJECTS).map((projectId) => [projectId, createProjectState(projectId)]),
    ),
  }
}

const defaultRasterFamily = getProjectRasterFamily(DEFAULT_PROJECT_ID)

export const RASTER_VARIABLES = defaultRasterFamily?.variables ?? {}
export const DEFAULT_RASTER_VARIABLE = Object.keys(RASTER_VARIABLES)[0] ?? ''
export const RASTER_PRODUCTS = defaultRasterFamily?.products ?? ['NRT']
export const ENSEMBLE_TRACES = defaultRasterFamily?.ensembleTraces ?? ['Mean']
export const DEFAULT_DATE = defaultRasterFamily?.defaultDate ?? '2026-04-13'
export const DEFAULT_DATETIME = defaultRasterFamily?.defaultDateTime ?? '2026-04-13T12:00'
export const TERRAIN_SOURCE_ID = 'terrain_source'
export const TERRAIN_SPEC = { source: TERRAIN_SOURCE_ID, exaggeration: 1 }
export const RIVER_NETWORK_PMTILES_URL =
  'https://cw3e.ucsd.edu/wrf_hydro/cnrfc/pmtiles/nwm_reaches_cnrfc_idx.pmtiles'
export const UCRB_RIVER_NETWORK_PMTILES_URL =
  'https://cw3e.ucsd.edu/wrf_hydro/ucrb/pmtiles/nwm_reaches_ucrb.pmtiles'
export const RIVER_NETWORK_SOURCE_LAYER = 'NWM_v2.1_channels'
export const MERIT_BASINS_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/merit_rivers/riv_MERIT_Hydro_v07_Basins_v01_dense.pmtiles'
export const MERIT_BASINS_SOURCE_LAYER = 'MERIT-Basins_Rivers'
export const GRADES_HYDRODL_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/grades_hydrodl/pmtiles/riv_20251231.pmtiles'
export const FORECAST_BASINS_PMTILES_URL =
  'https://cw3e.ucsd.edu/wrf_hydro/cnrfc/pmtiles/CNRFC_Basins.pmtiles'
export const FORECAST_BASINS_SOURCE_LAYER = 'CNRFC_Basins'
export const DEFAULT_STATE = createDefaultAppState()

export const BASEMAP_STYLES = {
  flat: 'https://cw3e.ucsd.edu/hydro/styles/positron.json',
  terrain: 'https://cw3e.ucsd.edu/hydro/styles/terrain_maptiler.json',
  satellite: 'https://cw3e.ucsd.edu/hydro/styles/satellite_maptiler.json',
}

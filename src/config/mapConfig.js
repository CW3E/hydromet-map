import { GRADES_BINARY_DESCRIPTOR_URL } from '../lib/gradesBinaryData'

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
    id: 'globalRaster',
    label: 'Global Rasters',
    type: 'png-overlay',
    description: 'Global raster overlay rendered from a variable and date.',
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
    id: 'conusRivers',
    label: 'NWM Rivers (CONUS)',
    type: 'vector-tile',
    description: 'CONUS flowlines and stream segments from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#008b8b',
  },
  {
    id: 'hucBasins',
    label: 'HUC Basins',
    type: 'vector-tile',
    description: 'Watershed Boundary Dataset HUC basin outlines.',
    symbol: '\u2610',
    symbolColor: '#4b5563',
  },
  {
    id: 'cnrfcStreamflow',
    label: 'CNRFC Streamflow',
    type: 'vector-tile',
    description: 'CNRFC-region flowlines colored by streamflow attributes from a separate tiled source.',
    symbol: '\uFF5E',
    symbolColor: '#8b5cf6',
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
    id: 'gradesHydroDlStatic',
    label: 'GRADES-hydroDL (v2.0 static)',
    type: 'vector-tile',
    description: 'Global GRADES-hydroDL flowlines from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#8b5cf6',
  },
  {
    id: 'gradesHydroDl',
    label: 'GRADES-hydroDL (v2.0)',
    type: 'vector-tile',
    description: 'Global GRADES-hydroDL flowlines colored from date-specific tiled streamflow attributes.',
    symbol: '\uFF5E',
    symbolColor: '#8b5cf6',
  },
  {
    id: 'swordReaches',
    label: 'SWORD Reaches (v17b)',
    type: 'vector-tile',
    description: 'Global SWORD reaches from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#2563eb',
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
    id: 'camaFlood',
    label: 'Cama-Flood (6min)',
    type: 'vector-tile',
    description: 'Global Cama-Flood flowlines from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#32cd32',
  },
  {
    id: 'grit',
    label: 'GRIT (v0.6)',
    type: 'vector-tile',
    description: 'Global GRIT flowlines from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#ff69b4',
  },
  {
    id: 'hydroRivers',
    label: 'HydroRIVERS (v1.0)',
    type: 'vector-tile',
    description: 'Global HydroRIVERS flowlines from tiled vector sources.',
    symbol: '\uFF5E',
    symbolColor: '#8a2be2',
  },
  {
    id: 'gsha',
    label: 'GSHA (v1.1)',
    type: 'vector-tile',
    description: 'Global GSHA gauge points from tiled vector sources.',
    symbol: '\u25CF',
    symbolColor: '#ff8c00',
  },
  {
    id: 'geodar',
    label: 'GeoDAR (v1.1)',
    type: 'vector-tile',
    description: 'Global GeoDAR reservoir points from tiled vector sources.',
    symbol: '\u0394',
    symbolColor: '#000000',
  },
  {
    id: 'ocwdBoundary',
    label: 'OCWD Property',
    type: 'vector',
    description: 'OCWD ownership boundary polygons from GeoJSON sources.',
    symbol: '\u2610',
    symbolColor: '#000000',
  },
  {
    id: 'pradoBasin',
    label: 'OCWD Prado Basin (566\')',
    type: 'vector',
    description: 'Prado Basin extent polygon from GeoJSON sources.',
    symbol: '\u2610',
    symbolColor: '#1f1f1f',
  },
  {
    id: 'ocwdWells',
    label: 'OCWD Monitoring Wells',
    type: 'vector-tile',
    description: 'OCWD monitoring well points from tiled vector sources.',
    symbol: '\u25CF',
    symbolColor: '#ff8c00',
  },
  {
    id: 'ocwdWetlands',
    label: 'OCWD Wetlands',
    type: 'vector',
    description: 'OCWD wetland pond polygons from GeoJSON sources.',
    symbol: '\u2610',
    symbolColor: '#90ee90',
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
    id: 'cw3eMetObs',
    label: 'CW3E Met Obs',
    type: 'vector',
    description: 'CW3E meteorological observation stations.',
    symbol: '\u25CF',
    symbolColor: '#000080',
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

export const GLOBAL_RASTER_COORDINATES = [
  [-180, 85],
  [180, 85],
  [180, -85],
  [-180, -85],
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

export const GLOBAL_RASTER_VARIABLES = {
  precipitationDaily: {
    label: 'Daily P',
    units: 'mm',
    timestep: '1day',
    coordinates: GLOBAL_RASTER_COORDINATES,
    palette: {
      thresholds: ['1', '2.5', '5', '7.5', '10', '15', '20', '30', '40', '50', '70', '100', '150', '200', '250', '300', '400', '500', '600'],
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
      return `https://cw3e.ucsd.edu/hydro/grades_hydrodl/imgs/${getRasterProductPath(product)}/${yyyy}/prec_${yyyymmdd}.png`
    },
  },
  temperatureDailyMaximum: {
    label: 'Daily Tmax',
    units: '\u00B0C',
    timestep: '1day',
    coordinates: GLOBAL_RASTER_COORDINATES,
    palette: {
      thresholds: ['-28', '-20', '-15', '-10', '-6', '-3', '0', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '34', '38'],
      colors: [
        '#d0d0d0',
        '#d8b9e6',
        '#b485d0',
        '#8a4cb4',
        '#5d1f95',
        '#3524c9',
        '#0a36ff',
        '#0f79d6',
        '#0fa282',
        '#0fb33d',
        '#5acc18',
        '#b0e714',
        '#fff300',
        '#ffd200',
        '#ffad00',
        '#ff7a00',
        '#ff3d00',
        '#ff7d7d',
        '#ffc0c0',
        '#e0e0e0',
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
      return `https://cw3e.ucsd.edu/hydro/grades_hydrodl/imgs/${getRasterProductPath(product)}/${yyyy}/tmax_${yyyymmdd}.png`
    },
  },
  temperatureDailyMinimum: {
    label: 'Daily Tmin',
    units: '\u00B0C',
    timestep: '1day',
    coordinates: GLOBAL_RASTER_COORDINATES,
    palette: {
      thresholds: ['-28', '-20', '-15', '-10', '-6', '-3', '0', '3', '6', '9', '12', '15', '18', '21', '24', '27', '30', '34', '38'],
      colors: [
        '#d0d0d0',
        '#d8b9e6',
        '#b485d0',
        '#8a4cb4',
        '#5d1f95',
        '#3524c9',
        '#0a36ff',
        '#0f79d6',
        '#0fa282',
        '#0fb33d',
        '#5acc18',
        '#b0e714',
        '#fff300',
        '#ffd200',
        '#ffad00',
        '#ff7a00',
        '#ff3d00',
        '#ff7d7d',
        '#ffc0c0',
        '#e0e0e0',
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
      return `https://cw3e.ucsd.edu/hydro/grades_hydrodl/imgs/${getRasterProductPath(product)}/${yyyy}/tmin_${yyyymmdd}.png`
    },
  },
}

export const LAYER_FAMILIES = {
  cnrfc: {
    id: 'cnrfc',
    label: 'CNRFC Hydro',
    raster: {
      layerId: 'cnrfcRaster',
      variables: CNRFC_RASTER_VARIABLES,
    },
    selectors: {
      products: ['NRT', 'WWRF-ECMWF', 'WWRF-GFS', 'GFS'],
      ensembleTraces: ['Control', 'Mean', 'P10', 'P50', 'P90'],
      statusUrl: 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/status.json',
      statusKey: 'WRF-Hydro NRT',
      defaultDate: '2026-04-13',
      defaultDateTime: '2026-04-13T12:00',
    },
    statusPanel: {
      title: 'CNRFC Job Status',
      hideTitle: true,
      url: 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/job_status.json',
      renderer: 'cnrfcJobTable',
    },
    linkedLayers: {
      cnrfcStreamflow: {
        buildDataPmtilesUrl: ({ date, product }) => {
          if (!date) {
            return null
          }

          const yyyymmdd = date.replaceAll('-', '')

          if (yyyymmdd.length !== 8) {
            return null
          }

          return `https://cw3e.ucsd.edu/hydro/cnrfc/pmtiles/${getRasterProductPath(product)}/data_cnrfc_idx_${yyyymmdd}.pmtiles`
        },
      },
    },
  },
  ucrb: {
    id: 'ucrb',
    label: 'UCRB Hydro',
    raster: {
      layerId: 'ucrbRaster',
      variables: UCRB_RASTER_VARIABLES,
    },
    selectors: {
      products: ['NRT'],
      ensembleTraces: [],
      statusUrl: 'https://cw3e.ucsd.edu/hydro/ucrb/csv/status.json',
      statusKey: 'WRF-Hydro NRT',
      defaultDate: '2026-04-13',
      defaultDateTime: '2026-04-13T12:00',
    },
    statusPanel: {
      title: 'UCRB Status',
      url: 'https://cw3e.ucsd.edu/hydro/ucrb/csv/status.json',
      renderer: 'genericSections',
      sections: [
        {
          title: 'Product Status',
          rows: [
            { label: 'WRF-Hydro NRT', path: 'WRF-Hydro NRT' },
          ],
        },
      ],
    },
    linkedLayers: {},
  },
  globalHydro: {
    id: 'globalHydro',
    label: 'Global Hydro',
    raster: {
      layerId: 'globalRaster',
      variables: GLOBAL_RASTER_VARIABLES,
    },
    selectors: {
      products: ['NRT'],
      productLabels: {
        NRT: 'NRT (MSWEP+ERA5)',
      },
      ensembleTraces: [],
      defaultDate: '2025-12-20',
      defaultDateTime: '2025-12-20T12:00',
      minDate: '2025-01-01',
      minDateTime: '2025-01-01T00:00',
      timeStep: '1day',
      dateSelector: true,
    },
    statusPanel: {
      title: 'Global Hydro Status',
      url: GRADES_BINARY_DESCRIPTOR_URL,
      renderer: 'gradesDescriptor',
    },
    linkedLayers: {
      gradesHydroDl: {
        buildDataPmtilesUrl: ({ date }) => {
          if (!date) {
            return null
          }

          const yyyymmdd = date.replaceAll('-', '')

          if (yyyymmdd.length !== 8) {
            return null
          }

          return `https://cw3e.ucsd.edu/hydro/grades_hydrodl/pmtiles/nrt/grades-hydrodl_${yyyymmdd}.pmtiles`
        },
      },
    },
  },
}

function buildDefaultFamilyState(layerFamily) {
  const familyVariables = layerFamily?.raster?.variables ?? {}
  const familySelectors = layerFamily?.selectors ?? {}
  const variableIds = Object.keys(familyVariables)
  const defaultVariable = variableIds[0] ?? ''

  return {
    variable: defaultVariable,
    product: familySelectors.products?.[0] ?? 'NRT',
    ensemble: familySelectors.ensembleTraces?.[1] ?? familySelectors.ensembleTraces?.[0] ?? '',
    temporalMode: 'date',
    date: familySelectors.defaultDate ?? '2026-04-13',
    datetime: familySelectors.defaultDateTime ?? '2026-04-13T12:00',
  }
}

function buildLayerState(visibleLayerIds = []) {
  const visibleLayerIdSet = new Set(visibleLayerIds)

  return Object.fromEntries(
    ALL_MAP_LAYERS.map((layer) => [layer.id, visibleLayerIdSet.has(layer.id)]),
  )
}

function buildDefaultProjectState(projectDefinition) {
  const layerFamily = projectDefinition.layerFamilyId
    ? LAYER_FAMILIES[projectDefinition.layerFamilyId]
    : null
  const defaultFamilyState = layerFamily
    ? {
        ...buildDefaultFamilyState(layerFamily),
        ...(projectDefinition.defaultFamily ?? {}),
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
    family: defaultFamilyState,
  }
}

export const PROJECTS = {
  cnrfc: {
    id: 'cnrfc',
    label: 'CNRFC',
    documentTitle: 'CW3E River Forecasting (CNRFC Region)',
    statusButtonEnabled: true,
    logoUrl: 'https://cw3e.ucsd.edu/images/CW3E_Logos/5-Vertical-Acronym_Only/Digital/PNG/CW3E-Logo-Vertical-Acronym-FullColor.png',
    logoAlt: 'Center for Western Weather and Water Extremes (CW3E)',
    logoHref: 'https://cw3e.ucsd.edu',
    layerFamilyId: 'cnrfc',
    defaultFamily: {
      variable: 'soilMoistureDaily',
    },
    availableLayerIds: [
      'cnrfcRaster',
      'cnrfcRegion',
      'cnrfcRivers',
      'cnrfcStreamflow',
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
  cw3eObs: {
    id: 'cw3eObs',
    label: 'CW3E Observations',
    documentTitle: 'CW3E Observations',
    statusButtonEnabled: false,
    logoUrl: 'https://cw3e.ucsd.edu/images/CW3E_Logos/5-Vertical-Acronym_Only/Digital/PNG/CW3E-Logo-Vertical-Acronym-FullColor.png',
    logoAlt: 'Center for Western Weather and Water Extremes (CW3E)',
    logoHref: 'https://cw3e.ucsd.edu',
    defaultView: {
      center: '-119.5,39.5',
      zoom: '4.2',
      bearing: '0',
      pitch: '0',
    },
    defaultBasemapId: 'terrain',
    availableLayerIds: ['conusRivers', 'hucBasins', 'cw3eMetObs'],
    defaultVisibleLayerIds: ['conusRivers', 'cw3eMetObs'],
  },
  ocwd: {
    id: 'ocwd',
    label: 'OCWD',
    documentTitle: 'CW3E OCWD Digital Twin',
    statusButtonEnabled: false,
    defaultView: {
      center: '-117.6215,33.9226',
      zoom: '12',
      bearing: '0',
      pitch: '0',
    },
    defaultBasemapId: 'flat',
    logoUrl: 'https://cw3e.ucsd.edu/images/CW3E_Logos/5-Vertical-Acronym_Only/Digital/PNG/CW3E-Logo-Vertical-Acronym-FullColor.png',
    logoAlt: 'Center for Western Weather and Water Extremes (CW3E)',
    logoHref: 'https://cw3e.ucsd.edu',
    layerFamilyId: 'cnrfc',
    defaultFamily: {
      variable: 'precipitationDaily',
    },
    availableLayerIds: [
      'cnrfcRaster',
      'cnrfcRegion',
      'cnrfcRivers',
      'cnrfcStreamflow',
      'cnrfcBasins',
      'cnrfcPoints',
      'ocwdBoundary',
      'ocwdWetlands',
      'pradoBasin',
      'ocwdWells',
    ],
    defaultVisibleLayerIds: [
      'cnrfcRaster',
      'cnrfcBasins',
      'cnrfcPoints',
      'cnrfcRegion',
      'cnrfcRivers',
      'ocwdWells',
    ],
  },
  b120: {
    id: 'b120',
    label: 'B120',
    documentTitle: 'CW3E B120 Forecasting',
    statusButtonEnabled: false,
    logoUrl: 'https://cw3e.ucsd.edu/images/CW3E_Logos/5-Vertical-Acronym_Only/Digital/PNG/CW3E-Logo-Vertical-Acronym-FullColor.png',
    logoAlt: 'Center for Western Weather and Water Extremes (CW3E)',
    logoHref: 'https://cw3e.ucsd.edu',
    defaultView: {
      center: '-119,39',
      zoom: '5.6',
      bearing: '0',
      pitch: '0',
    },
    layerFamilyId: 'cnrfc',
    defaultFamily: {
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
    documentTitle: 'CW3E Yampa Forecasting',
    statusButtonEnabled: false,
    logoUrl: 'https://cw3e.ucsd.edu/images/CW3E_Logos/5-Vertical-Acronym_Only/Digital/PNG/CW3E-Logo-Vertical-Acronym-FullColor.png',
    logoAlt: 'Center for Western Weather and Water Extremes (CW3E)',
    logoHref: 'https://cw3e.ucsd.edu',
    layerFamilyId: 'ucrb',
    defaultFamily: {
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
    documentTitle: 'Global Hydrology Explorer',
    statusButtonEnabled: false,
    logoUrl: 'https://maps.reachhydro.org/imgs/logo_square_100_rounded_50.png',
    logoAlt: 'reachhydro.org',
    logoHref: 'https://reachhydro.org',
    about: {
      title: 'Global Hydrology Explorer',
      markdownUrl: 'about/global.md',
    },
    defaultView: {
      center: '55,30',
      zoom: '2.8',
      bearing: '0',
      pitch: '0',
    },
    defaultBasemapId: 'terrain',
    defaultTerrainEnabled: true,
    defaultProjection: 'globe',
    layerFamilyId: 'globalHydro',
    availableLayerIds: [
      'globalRaster',
      'gradesHydroDl',
      'camaFlood',
      'hydroRivers',
      'meritBasins',
      'grit',
      'swordReaches',
      'gsha',
      'geodar',
      'hucBasins',
    ],
    defaultVisibleLayerIds: ['globalRaster', 'gradesHydroDl', 'gsha'],
  },
}

export const PROJECT_OPTIONS = Object.values(PROJECTS).map(({ id, label }) => ({ id, label }))
export const DEFAULT_PROJECT_ID = 'global'

export function getProjectDefinition(projectId = DEFAULT_PROJECT_ID) {
  return PROJECTS[projectId] ?? PROJECTS[DEFAULT_PROJECT_ID]
}

export function getLayerFamilyDefinition(layerFamilyId) {
  return layerFamilyId ? LAYER_FAMILIES[layerFamilyId] ?? null : null
}

export function getProjectLayerFamily(projectId = DEFAULT_PROJECT_ID) {
  const projectDefinition = getProjectDefinition(projectId)
  return getLayerFamilyDefinition(projectDefinition?.layerFamilyId)
}

export const RASTER_FAMILIES = LAYER_FAMILIES
export const getRasterFamilyDefinition = getLayerFamilyDefinition
export const getProjectRasterFamily = getProjectLayerFamily

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

const defaultLayerFamily = getProjectLayerFamily(DEFAULT_PROJECT_ID)

export const RASTER_VARIABLES = defaultLayerFamily?.raster?.variables ?? {}
export const DEFAULT_RASTER_VARIABLE = Object.keys(RASTER_VARIABLES)[0] ?? ''
export const RASTER_PRODUCTS = defaultLayerFamily?.selectors?.products ?? ['NRT']
export const ENSEMBLE_TRACES = defaultLayerFamily?.selectors?.ensembleTraces ?? ['Mean']
export const DEFAULT_DATE = defaultLayerFamily?.selectors?.defaultDate ?? '2026-04-13'
export const DEFAULT_DATETIME = defaultLayerFamily?.selectors?.defaultDateTime ?? '2026-04-13T12:00'
export const TERRAIN_SOURCE_ID = 'terrain_source'
export const TERRAIN_SPEC = { source: TERRAIN_SOURCE_ID, exaggeration: 1 }
export const RIVER_NETWORK_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/cnrfc/pmtiles/nwm_reaches_cnrfc_idx.pmtiles'
export const CONUS_RIVER_NETWORK_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/conus/pmtiles/nwm_reaches_conus.pmtiles'
export const HUC_BASINS_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/conus/pmtiles/WBDHU.pmtiles'
export const HUC_BASINS_SOURCE_LAYER = 'WBDHU'
export const CNRFC_STREAMFLOW_DATA_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/cnrfc/pmtiles/nrt/data_cnrfc_idx_20260426.pmtiles'
export const UCRB_RIVER_NETWORK_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/ucrb/pmtiles/nwm_reaches_ucrb.pmtiles'
export const RIVER_NETWORK_SOURCE_LAYER = 'NWM_v2.1_channels'
export const CNRFC_STREAMFLOW_DATA_SOURCE_LAYER = 'CNRFC_Streamflow'
export const MERIT_BASINS_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/merit_rivers/riv_MERIT_Hydro_v07_Basins_v01_dense.pmtiles'
export const MERIT_BASINS_SOURCE_LAYER = 'MERIT-Basins_Rivers'
export const CAMA_FLOOD_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/camaflood_rivers/strnet_06min.pmtiles'
export const CAMA_FLOOD_SOURCE_LAYER = 'CaMa-Flood_06min'
export const GRIT_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/grit/GRITv06_segments.pmtiles'
export const GRIT_SOURCE_LAYER = 'GRITv06_segments'
export const HYDRO_RIVERS_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/hydrosheds/HydroRIVERS_v10.pmtiles'
export const HYDRO_RIVERS_SOURCE_LAYER = 'HydroRIVERS_v10'
export const GSHA_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/gsha/pmtiles/GSHA_MERIT.pmtiles'
export const GSHA_SOURCE_LAYER = 'GSHA_MERIT'
export const GEODAR_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/geodar/GeoDAR_MERIT.pmtiles'
export const GEODAR_SOURCE_LAYER = 'GeoDAR_MERIT'
export const OCWD_WELLS_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/ocwd/pmtiles/OCWD_MonitoringWells.pmtiles'
export const OCWD_WELLS_SOURCE_LAYER = 'OCWD_MonitoringWells'
export const GRADES_HYDRODL_STREAMFLOW_SOURCE_LAYER = 'GRADES-hydroDL_Streamflow'
export const GRADES_HYDRODL_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/grades_hydrodl/pmtiles/riv_nrt.pmtiles'
export const SWORD_REACHES_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/grades_hydrodl/pmtiles/sword_reaches_v17b_indexed.pmtiles'
export const SWORD_REACHES_SOURCE_LAYER = 'SWORD_Reaches_v17b'
export const FORECAST_BASINS_PMTILES_URL =
  'https://cw3e.ucsd.edu/hydro/cnrfc/pmtiles/CNRFC_Basins.pmtiles'
export const FORECAST_BASINS_SOURCE_LAYER = 'CNRFC_Basins'
export const DEFAULT_STATE = createDefaultAppState()

export const BASEMAP_STYLES = {
  flat: 'https://cw3e.ucsd.edu/hydro/styles/positron.json',
  terrain: 'https://cw3e.ucsd.edu/hydro/styles/terrain_maptiler.json',
  satellite: 'https://cw3e.ucsd.edu/hydro/styles/satellite_maptiler.json',
}

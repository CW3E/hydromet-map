export const BASEMAPS = [
  {
    id: 'streets',
    label: 'Streets',
    description: 'Balanced reference style for day-to-day hydromet browsing.',
    terrainAvailable: true,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Imagery-forward basemap for terrain and storm context.',
    terrainAvailable: true,
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Low-clutter style for emphasizing overlays and legends.',
    terrainAvailable: false,
  },
]

export const MAP_LAYERS = [
  {
    id: 'watersheds',
    label: 'Watersheds',
    type: 'vector',
    description: 'Administrative hydrologic basin boundaries.',
  },
  {
    id: 'rivers',
    label: 'River Network',
    type: 'vector-tile',
    description: 'Flowlines and stream segments from tiled vector sources.',
  },
  {
    id: 'stations',
    label: 'Observation Stations',
    type: 'vector',
    description: 'Clickable station points for time-series lookups.',
  },
  {
    id: 'radar',
    label: 'Radar Mosaic',
    type: 'raster-tile',
    description: 'Near-real-time weather radar tile overlay.',
  },
  {
    id: 'forecast',
    label: 'Forecast Raster Overlay',
    type: 'png-overlay',
    description: 'Model raster rendered from a variable, date, and ensemble.',
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
export const TERRAIN_SOURCE_ID = 'terrain-dem'
export const TERRAIN_SPEC = { source: TERRAIN_SOURCE_ID, exaggeration: 1.15 }

export const DEFAULT_STATE = {
  view: {
    center: '-120.50,37.20',
    zoom: '5.8',
    bearing: '0',
    pitch: '30',
  },
  basemapId: 'streets',
  terrainEnabled: true,
  projection: 'globe',
  layers: {
    watersheds: true,
    rivers: true,
    stations: true,
    radar: false,
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

const terrainSource = {
  type: 'raster-dem',
  url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
  tileSize: 256,
}

export const BASEMAP_STYLES = {
  streets: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
      },
      [TERRAIN_SOURCE_ID]: terrainSource,
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#dfeaf0',
        },
      },
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
      },
    ],
  },
  satellite: {
    version: 8,
    sources: {
      imagery: {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri',
      },
      [TERRAIN_SOURCE_ID]: terrainSource,
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#0f1f2d',
        },
      },
      {
        id: 'imagery',
        type: 'raster',
        source: 'imagery',
      },
    ],
  },
  minimal: {
    version: 8,
    sources: {
      cartoLight: {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      },
      [TERRAIN_SOURCE_ID]: terrainSource,
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#f4f7f8',
        },
      },
      {
        id: 'cartoLight',
        type: 'raster',
        source: 'cartoLight',
        paint: {
          'raster-saturation': -0.75,
          'raster-contrast': -0.1,
          'raster-brightness-max': 0.98,
        },
      },
    ],
  },
}

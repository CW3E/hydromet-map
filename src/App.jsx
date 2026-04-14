import { useEffect, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import Map, {
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  useControl,
  useMap,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import 'react-datepicker/dist/react-datepicker.css'
import './App.css'

const BASEMAPS = [
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

const MAP_LAYERS = [
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

const RASTER_VARIABLES = {
  precipitation: {
    label: 'Precipitation',
    units: 'mm',
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
    palette: [
      { value: '0', color: '#f0fdf4' },
      { value: '8', color: '#86efac' },
      { value: '15', color: '#22c55e' },
      { value: '22', color: '#15803d' },
      { value: '30+', color: '#14532d' },
    ],
  },
}

const RASTER_MODELS = ['GFS', 'ECMWF', 'WRF']
const ENSEMBLE_TRACES = ['Control', 'Mean', 'P10', 'P50', 'P90']
const DEFAULT_DATE = '2026-04-13'
const TERRAIN_SOURCE_ID = 'terrain-dem'
const TERRAIN_SPEC = { source: TERRAIN_SOURCE_ID, exaggeration: 1.15 }

const DEFAULT_STATE = {
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
    date: DEFAULT_DATE,
  },
}

const terrainSource = {
  type: 'raster-dem',
  url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
  tileSize: 256,
}

const BASEMAP_STYLES = {
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

const WATERSHEDS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Sacramento Basin' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-123.1, 39.6],
          [-121.1, 40.25],
          [-119.4, 39.75],
          [-119.8, 37.9],
          [-121.7, 37.35],
          [-123.1, 39.6],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'San Joaquin Basin' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.2, 37.75],
          [-120.2, 38.15],
          [-118.9, 37.2],
          [-119.4, 35.55],
          [-121.55, 35.45],
          [-122.2, 37.75],
        ]],
      },
    },
  ],
}

const RIVERS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Sacramento River' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-122.35, 40.5],
          [-121.9, 39.7],
          [-121.65, 39.05],
          [-121.55, 38.55],
          [-121.5, 38.1],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'San Joaquin River' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-119.7, 37.4],
          [-119.75, 36.8],
          [-120.0, 36.25],
          [-120.25, 35.85],
        ],
      },
    },
  ],
}

const STATIONS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'SAC-01', name: 'Upper Basin Station', variable: 'Streamflow' },
      geometry: { type: 'Point', coordinates: [-121.76, 39.28] },
    },
    {
      type: 'Feature',
      properties: { id: 'SJV-14', name: 'Valley Forecast Point', variable: 'Precipitation' },
      geometry: { type: 'Point', coordinates: [-120.44, 37.31] },
    },
    {
      type: 'Feature',
      properties: { id: 'COA-07', name: 'Coastal Wind Station', variable: 'Wind Gust' },
      geometry: { type: 'Point', coordinates: [-122.07, 36.96] },
    },
  ],
}

const RADAR_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { intensity: 'moderate' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.2, 38.85],
          [-120.4, 39.15],
          [-119.85, 38.2],
          [-121.2, 37.35],
          [-122.35, 38.0],
          [-122.2, 38.85],
        ]],
      },
    },
  ],
}

const FORECAST_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { zone: 'Central Forecast Swath' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-121.85, 38.85],
          [-119.45, 38.95],
          [-118.95, 36.55],
          [-121.15, 36.25],
          [-121.85, 38.85],
        ]],
      },
    },
  ],
}

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search)
  if (!params.toString()) {
    return DEFAULT_STATE
  }

  const nextState = structuredClone(DEFAULT_STATE)
  const basemapId = params.get('basemap')
  const projection = params.get('projection')
  const terrain = params.get('terrain')
  const center = params.get('center')
  const zoom = params.get('zoom')
  const bearing = params.get('bearing')
  const pitch = params.get('pitch')
  const variable = params.get('variable')
  const model = params.get('model')
  const ensemble = params.get('ensemble')
  const date = params.get('date')
  const layers = params.get('layers')

  if (BASEMAPS.some((item) => item.id === basemapId)) {
    nextState.basemapId = basemapId
  }

  if (projection === 'globe' || projection === 'mercator') {
    nextState.projection = projection
  }

  if (terrain === 'true' || terrain === 'false') {
    nextState.terrainEnabled = terrain === 'true'
  }

  if (center) {
    nextState.view.center = center
  }

  if (zoom) {
    nextState.view.zoom = zoom
  }

  if (bearing) {
    nextState.view.bearing = bearing
  }

  if (pitch) {
    nextState.view.pitch = pitch
  }

  if (Object.hasOwn(RASTER_VARIABLES, variable)) {
    nextState.raster.variable = variable
  }

  if (RASTER_MODELS.includes(model)) {
    nextState.raster.model = model
  }

  if (ENSEMBLE_TRACES.includes(ensemble)) {
    nextState.raster.ensemble = ensemble
  }

  if (date) {
    nextState.raster.date = date
  }

  if (layers) {
    const enabledIds = new Set(layers.split(','))
    MAP_LAYERS.forEach((layer) => {
      nextState.layers[layer.id] = enabledIds.has(layer.id)
    })
  }

  return nextState
}

function writeStateToUrl(state) {
  const params = new URLSearchParams()
  params.set('basemap', state.basemapId)
  params.set('projection', state.projection)
  params.set('terrain', String(state.terrainEnabled))
  params.set('center', state.view.center)
  params.set('zoom', state.view.zoom)
  params.set('bearing', state.view.bearing)
  params.set('pitch', state.view.pitch)
  params.set('variable', state.raster.variable)
  params.set('model', state.raster.model)
  params.set('ensemble', state.raster.ensemble)
  params.set('date', state.raster.date)
  params.set(
    'layers',
    MAP_LAYERS.filter((layer) => state.layers[layer.id])
      .map((layer) => layer.id)
      .join(','),
  )

  const nextUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', nextUrl)
  return window.location.href
}

function parseCenter(centerText) {
  const [longitudeText, latitudeText] = centerText.split(',')
  const longitude = Number.parseFloat(longitudeText)
  const latitude = Number.parseFloat(latitudeText)

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return { longitude: -120.5, latitude: 37.2 }
  }

  return { longitude, latitude }
}

function parseNumericValue(value, fallback) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseIsoDate(dateText) {
  const matchedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? new Date(`${dateText}T00:00:00`) : null
  return matchedDate && !Number.isNaN(matchedDate.getTime()) ? matchedDate : null
}

function formatCoordinate(value) {
  return value.toFixed(4)
}

function formatViewValue(value, digits = 2) {
  return value.toFixed(digits)
}

function shiftIsoDate(dateText, days) {
  const currentDate = new Date(`${dateText}T00:00:00`)
  currentDate.setDate(currentDate.getDate() + days)
  return currentDate.toISOString().slice(0, 10)
}

function shiftIsoMonth(dateText, months) {
  const currentDate = new Date(`${dateText}T00:00:00`)
  const originalDay = currentDate.getDate()
  currentDate.setDate(1)
  currentDate.setMonth(currentDate.getMonth() + months)
  const lastDayOfTargetMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate()
  currentDate.setDate(Math.min(originalDay, lastDayOfTargetMonth))
  return currentDate.toISOString().slice(0, 10)
}

function PanelSection({ title, eyebrow, children }) {
  return (
    <section className="panel-section">
      <div className="panel-section__header">
        <p className="panel-section__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function GlobeProjectionControl({ onProjectionChange }) {
  const { current: map } = useMap()
  const callbackRef = useRef(onProjectionChange)

  callbackRef.current = onProjectionChange

  useControl(({ mapLib }) => new mapLib.GlobeControl(), { position: 'top-right' })

  useEffect(() => {
    if (!map) {
      return undefined
    }

    const mapInstance = map.getMap()
    const syncProjection = () => {
      const projectionType = mapInstance.getProjection()?.type === 'globe' ? 'globe' : 'mercator'
      callbackRef.current(projectionType)
    }

    mapInstance.on('styledata', syncProjection)
    mapInstance.on('projectiontransition', syncProjection)
    syncProjection()

    return () => {
      mapInstance.off('styledata', syncProjection)
      mapInstance.off('projectiontransition', syncProjection)
    }
  }, [map])

  return null
}

function TerrainToggleControl({ enabled, onTerrainChange }) {
  const { current: map } = useMap()
  const callbackRef = useRef(onTerrainChange)

  callbackRef.current = onTerrainChange

  useControl(({ mapLib }) => new mapLib.TerrainControl(TERRAIN_SPEC), { position: 'top-right' })

  useEffect(() => {
    if (!map) {
      return undefined
    }

    const mapInstance = map.getMap()
    const syncTerrain = () => {
      callbackRef.current(Boolean(mapInstance.getTerrain()))
    }

    mapInstance.on('terrain', syncTerrain)
    syncTerrain()

    return () => {
      mapInstance.off('terrain', syncTerrain)
    }
  }, [map])

  useEffect(() => {
    if (!map) {
      return
    }

    const mapInstance = map.getMap()
    if (enabled && !mapInstance.getTerrain()) {
      mapInstance.setTerrain(TERRAIN_SPEC)
    }
    if (!enabled && mapInstance.getTerrain()) {
      mapInstance.setTerrain(null)
    }
  }, [enabled, map])

  return null
}

function App() {
  const [appState, setAppState] = useState(() => readStateFromUrl())
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [copyStatus, setCopyStatus] = useState('Copy URL')
  const [selectedStation, setSelectedStation] = useState(null)
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false)
  const bookmarkWidgetRef = useRef(null)

  useEffect(() => {
    setBookmarkUrl(writeStateToUrl(appState))
  }, [appState])

  useEffect(() => {
    if (copyStatus === 'Copied') {
      const timeoutId = window.setTimeout(() => {
        setCopyStatus('Copy URL')
      }, 1600)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [copyStatus])

  useEffect(() => {
    if (!bookmarkOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!bookmarkWidgetRef.current?.contains(event.target)) {
        setBookmarkOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [bookmarkOpen])

  const selectedBasemap = BASEMAPS.find((item) => item.id === appState.basemapId) ?? BASEMAPS[0]
  const selectedVariable = RASTER_VARIABLES[appState.raster.variable]
  const center = parseCenter(appState.view.center)
  const mapViewState = {
    longitude: center.longitude,
    latitude: center.latitude,
    zoom: parseNumericValue(appState.view.zoom, 5.8),
    bearing: parseNumericValue(appState.view.bearing, 0),
    pitch: parseNumericValue(appState.view.pitch, 30),
  }
  const terrainEnabled = selectedBasemap.terrainAvailable && appState.terrainEnabled
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bookmarkUrl)}`

  function updateTopLevel(key, value) {
    setAppState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updateRaster(key, value) {
    setAppState((current) => ({
      ...current,
      raster: {
        ...current.raster,
        [key]: value,
      },
    }))
  }

  function toggleLayer(layerId) {
    setAppState((current) => ({
      ...current,
      layers: {
        ...current.layers,
        [layerId]: !current.layers[layerId],
      },
    }))
  }

  function handleMapMove(event) {
    const nextView = event.viewState
    setAppState((current) => ({
      ...current,
      view: {
        center: `${formatCoordinate(nextView.longitude)},${formatCoordinate(nextView.latitude)}`,
        zoom: formatViewValue(nextView.zoom, 2),
        bearing: formatViewValue(nextView.bearing, 1),
        pitch: formatViewValue(nextView.pitch, 1),
      },
    }))
  }

  function handleMapClick(event) {
    const clickedFeature = event.features?.[0]

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
      setSelectedStation(null)
      return
    }

    setSelectedStation({
      id: clickedFeature.properties.id,
      name: clickedFeature.properties.name,
      variable: clickedFeature.properties.variable,
      longitude: clickedFeature.geometry.coordinates[0],
      latitude: clickedFeature.geometry.coordinates[1],
    })
  }

  async function handleCopyBookmark() {
    try {
      await navigator.clipboard.writeText(bookmarkUrl)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  return (
    <div className="app-shell">
      <aside className="control-panel">
        <PanelSection title="Layers and Raster Source" eyebrow="Display Controls">
          <details className="layer-dropdown">
            <summary>
              Active layers ({MAP_LAYERS.filter((layer) => appState.layers[layer.id]).length}/
              {MAP_LAYERS.length})
            </summary>
            <div className="layer-list">
              {MAP_LAYERS.map((layer) => (
                <label key={layer.id} className="layer-row" title={layer.description}>
                  <strong>{layer.label}</strong>
                  <input
                    type="checkbox"
                    checked={appState.layers[layer.id]}
                    onChange={() => toggleLayer(layer.id)}
                  />
                </label>
              ))}
            </div>
          </details>

          <div className="date-row">
            <button
              className="date-icon-button"
              type="button"
              aria-label="One month before"
              onClick={() => {
                updateRaster('date', shiftIsoMonth(appState.raster.date, -1))
              }}
            >
              <span aria-hidden="true">◀◀</span>
            </button>

            <button
              className="date-icon-button"
              type="button"
              aria-label="Previous day"
              onClick={() => {
                updateRaster('date', shiftIsoDate(appState.raster.date, -1))
              }}
            >
              <span aria-hidden="true">◀</span>
            </button>

            <label className="date-field">
              <DatePicker
                calendarClassName="hydromet-datepicker__calendar"
                className="hydromet-datepicker__input"
                dateFormat="yyyy-MM-dd"
                placeholderText="YYYY-MM-DD"
                popperPlacement="bottom-start"
                selected={parseIsoDate(appState.raster.date)}
                onChange={(date) => {
                  if (date) {
                    updateRaster('date', date.toISOString().slice(0, 10))
                  }
                }}
              />
            </label>

            <button
              className="date-icon-button"
              type="button"
              aria-label="Next day"
              onClick={() => {
                updateRaster('date', shiftIsoDate(appState.raster.date, 1))
              }}
            >
              <span aria-hidden="true">▶</span>
            </button>

            <button
              className="date-icon-button"
              type="button"
              aria-label="One month after"
              onClick={() => {
                updateRaster('date', shiftIsoMonth(appState.raster.date, 1))
              }}
            >
              <span aria-hidden="true">▶▶</span>
            </button>
          </div>

          <div className="form-grid">
            <label>
              Variable
              <select
                value={appState.raster.variable}
                onChange={(event) => updateRaster('variable', event.target.value)}
              >
                {Object.entries(RASTER_VARIABLES).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Model
              <select
                value={appState.raster.model}
                onChange={(event) => updateRaster('model', event.target.value)}
              >
                {RASTER_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ensemble
              <select
                value={appState.raster.ensemble}
                onChange={(event) => updateRaster('ensemble', event.target.value)}
              >
                {ENSEMBLE_TRACES.map((trace) => (
                  <option key={trace} value={trace}>
                    {trace}
                  </option>
                ))}
              </select>
            </label>

          </div>

        </PanelSection>
      </aside>

      <main className="map-stage">
        <section className="map-canvas">
          <Map
            {...mapViewState}
            attributionControl={false}
            interactiveLayerIds={appState.layers.stations ? ['stations-hit-layer'] : []}
            mapStyle={BASEMAP_STYLES[appState.basemapId]}
            projection={appState.projection}
            reuseMaps
            terrain={terrainEnabled ? TERRAIN_SPEC : null}
            onClick={handleMapClick}
            onMove={handleMapMove}
            style={{ width: '100%', height: '100%' }}
          >
            {appState.layers.watersheds ? (
              <Source id="watersheds-source" type="geojson" data={WATERSHEDS_GEOJSON}>
                <Layer
                  id="watersheds-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#4f9cb7',
                    'fill-opacity': 0.12,
                  }}
                />
                <Layer
                  id="watersheds-outline"
                  type="line"
                  paint={{
                    'line-color': '#216b85',
                    'line-width': 2,
                    'line-opacity': 0.85,
                  }}
                />
              </Source>
            ) : null}

            {appState.layers.rivers ? (
              <Source id="rivers-source" type="geojson" data={RIVERS_GEOJSON}>
                <Layer
                  id="rivers-line"
                  type="line"
                  paint={{
                    'line-color': '#1b78b1',
                    'line-width': 3,
                    'line-opacity': 0.9,
                  }}
                />
              </Source>
            ) : null}

            {appState.layers.forecast ? (
              <Source id="forecast-source" type="geojson" data={FORECAST_GEOJSON}>
                <Layer
                  id="forecast-fill"
                  type="fill"
                  paint={{
                    'fill-color': selectedVariable.palette[selectedVariable.palette.length - 1].color,
                    'fill-opacity': 0.22,
                  }}
                />
                <Layer
                  id="forecast-outline"
                  type="line"
                  paint={{
                    'line-color': selectedVariable.palette[selectedVariable.palette.length - 2].color,
                    'line-width': 2,
                    'line-dasharray': [2, 2],
                  }}
                />
              </Source>
            ) : null}

            {appState.layers.radar ? (
              <Source id="radar-source" type="geojson" data={RADAR_GEOJSON}>
                <Layer
                  id="radar-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#9a1f40',
                    'fill-opacity': 0.18,
                  }}
                />
              </Source>
            ) : null}

            {appState.layers.stations ? (
              <Source id="stations-source" type="geojson" data={STATIONS_GEOJSON}>
                <Layer
                  id="stations-layer"
                  type="circle"
                  paint={{
                    'circle-radius': 6,
                    'circle-color': '#10222f',
                    'circle-stroke-color': '#f5fbfd',
                    'circle-stroke-width': 2,
                  }}
                />
              </Source>
            ) : null}

            {appState.layers.stations ? (
              <Source id="stations-hit-source" type="geojson" data={STATIONS_GEOJSON}>
                <Layer
                  id="stations-hit-layer"
                  type="circle"
                  paint={{
                    'circle-radius': 14,
                    'circle-color': '#000000',
                    'circle-opacity': 0,
                  }}
                />
              </Source>
            ) : null}

            <NavigationControl position="top-right" visualizePitch />
            <GlobeProjectionControl
              onProjectionChange={(projection) => {
                setAppState((current) =>
                  current.projection === projection
                    ? current
                    : {
                        ...current,
                        projection,
                      },
                )
              }}
            />
            {selectedBasemap.terrainAvailable ? (
              <TerrainToggleControl
                enabled={terrainEnabled}
                onTerrainChange={(terrainIsEnabled) => {
                  setAppState((current) =>
                    current.terrainEnabled === terrainIsEnabled
                      ? current
                      : {
                          ...current,
                          terrainEnabled: terrainIsEnabled,
                        },
                  )
                }}
              />
            ) : null}
            <ScaleControl position="bottom-left" unit="metric" />

            {selectedStation ? (
              <Popup
                anchor="top"
                closeButton
                closeOnClick={false}
                latitude={selectedStation.latitude}
                longitude={selectedStation.longitude}
                maxWidth="280px"
                onClose={() => setSelectedStation(null)}
              >
                <div className="station-popup">
                  <strong>{selectedStation.name}</strong>
                  <p>{selectedStation.id}</p>
                  <span>{selectedStation.variable}</span>
                </div>
              </Popup>
            ) : null}
          </Map>

          <div className="map-canvas__overlay">
            <div
              className={basemapMenuOpen ? 'basemap-switcher is-open' : 'basemap-switcher'}
              title={selectedBasemap.description}
              onMouseEnter={() => setBasemapMenuOpen(true)}
              onMouseLeave={() => setBasemapMenuOpen(false)}
            >
              <button
                className="choice-card choice-card--current is-active"
                type="button"
                aria-label={`Current basemap: ${selectedBasemap.label}`}
              >
                <strong>{selectedBasemap.label}</strong>
              </button>

              <div className="basemap-switcher__menu">
                {BASEMAPS.map((basemap) => (
                  <button
                    key={basemap.id}
                    className={basemap.id === appState.basemapId ? 'choice-card is-active' : 'choice-card'}
                    onClick={() => {
                      updateTopLevel('basemapId', basemap.id)
                      if (!basemap.terrainAvailable && appState.terrainEnabled) {
                        updateTopLevel('terrainEnabled', false)
                      }
                      setBasemapMenuOpen(false)
                    }}
                    type="button"
                    title={basemap.description}
                  >
                    <strong>{basemap.label}</strong>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="map-legend">
            <div className="legend-card legend-card--map">
              <div className="legend-card__header legend-card__header--map">
                <strong>{selectedVariable.label}</strong>
                <span>{selectedVariable.units}</span>
              </div>
              <div className="legend-scale legend-scale--vertical">
                {selectedVariable.palette
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div
                      key={`${selectedVariable.label}-${entry.value}`}
                      className="legend-scale__stop legend-scale__stop--vertical"
                    >
                      <span style={{ backgroundColor: entry.color }} />
                      <small>{entry.value}</small>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div ref={bookmarkWidgetRef} className="bookmark-widget">
            <button
              className="bookmark-trigger"
              type="button"
              title="Bookmark this map"
              onClick={() => setBookmarkOpen((current) => !current)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="M6.75 3.75h10.5v16.5l-5.25-3.75-5.25 3.75Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>

            {bookmarkOpen ? (
              <div className="bookmark-popup">
                <div className="bookmark-popup__header">
                  <div>
                    <p className="map-canvas__eyebrow">Bookmark</p>
                    <strong>Share this map view</strong>
                  </div>
                  <button
                    className="bookmark-popup__close"
                    type="button"
                    onClick={() => setBookmarkOpen(false)}
                  >
                    x
                  </button>
                </div>

                <div className="bookmark-popup__body">
                  <img alt="QR code for current map bookmark" src={qrCodeUrl} />
                  <div className="bookmark-popup__content">
                    <button type="button" onClick={handleCopyBookmark}>
                      {copyStatus}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

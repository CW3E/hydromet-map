import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import 'react-datepicker/dist/react-datepicker.css'
import './App.css'
import {
  BASEMAPS,
  DEFAULT_DATE,
  DEFAULT_DATETIME,
  DEFAULT_RASTER_VARIABLE,
  DEFAULT_STATE,
  RASTER_VARIABLES,
} from './config/mapConfig'
import MapCanvas from './components/map/MapCanvas'
import {
  getDatePartFromDateTime,
  getTemporalModeForTimestep,
  mergeDateIntoDateTime,
  parseCenter,
  parseNumericValue,
  readStateFromUrl,
  writeStateToUrl,
} from './lib/appState'

const STATUS_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/status.json'
const STATUS_KEY = 'WRF-Hydro NRT'
const NRT_PRODUCT = 'NRT'

function formatStatusDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatStatusDateTime(date) {
  const datePart = formatStatusDate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${datePart}T${hours}:${minutes}`
}

function parseStatusTimestamp(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return null
  }

  const normalizedValue = rawValue.trim()
  const parsedDirectly = new Date(normalizedValue)

  if (!Number.isNaN(parsedDirectly.getTime())) {
    return parsedDirectly
  }

  const normalizedUtcValue = normalizedValue
    .replace(' UTC', 'Z')
    .replace(' GMT', 'Z')
    .replace(' ', 'T')
  const parsedNormalizedValue = new Date(normalizedUtcValue)

  return Number.isNaN(parsedNormalizedValue.getTime()) ? null : parsedNormalizedValue
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function buildStatusBoundary(statusTimestamp) {
  const maxForecastTimestamp = addDays(statusTimestamp, 16)

  return {
    boundaryDate: formatStatusDate(statusTimestamp),
    boundaryDateTime: formatStatusDateTime(statusTimestamp),
    maxDate: formatStatusDate(maxForecastTimestamp),
    maxDateTime: formatStatusDateTime(maxForecastTimestamp),
  }
}

function App() {
  const [appState, setAppState] = useState(() => readStateFromUrl())
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [copyStatus, setCopyStatus] = useState('Copy URL')
  const [selectedStation, setSelectedStation] = useState(null)
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const bookmarkWidgetRef = useRef(null)
  const basemapMenuRef = useRef(null)
  const layerMenuRef = useRef(null)
  const [statusBoundary, setStatusBoundary] = useState(() =>
    buildStatusBoundary(parseStatusTimestamp(DEFAULT_DATETIME) ?? new Date()),
  )

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
    if (!basemapMenuOpen && !layerMenuOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!basemapMenuRef.current?.contains(event.target)) {
        setBasemapMenuOpen(false)
      }
      if (!layerMenuRef.current?.contains(event.target)) {
        setLayerMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [basemapMenuOpen, layerMenuOpen])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hasExplicitRasterDate = params.has('date') || params.has('datetime')

    if (hasExplicitRasterDate) {
      return undefined
    }

    const abortController = new AbortController()

    async function loadStatusDefaults() {
      try {
        const response = await fetch(STATUS_URL, { signal: abortController.signal })

        if (!response.ok) {
          return
        }

        const statusData = await response.json()
        const statusTimestamp = parseStatusTimestamp(statusData?.[STATUS_KEY])

        if (!statusTimestamp) {
          return
        }

        const nextDate = formatStatusDate(statusTimestamp)
        const nextDateTime = formatStatusDateTime(statusTimestamp)
        setStatusBoundary(buildStatusBoundary(statusTimestamp))

        setAppState((current) => ({
          ...current,
          raster: {
            ...current.raster,
            date: current.raster.date === DEFAULT_DATE ? nextDate : current.raster.date,
            datetime:
              current.raster.datetime === DEFAULT_DATETIME ? nextDateTime : current.raster.datetime,
          },
        }))
      } catch (error) {
        if (error?.name !== 'AbortError') {
          // Keep the built-in defaults if the remote status file is unavailable.
        }
      }
    }

    loadStatusDefaults()

    return () => {
      abortController.abort()
    }
  }, [])

  useEffect(() => {
    const forecastProducts = ['WWRF-ECMWF', 'WWRF-GFS', 'GFS']

    setAppState((current) => {
      const nextRaster = { ...current.raster }
      let hasChanges = false

      if (nextRaster.date > statusBoundary.maxDate) {
        nextRaster.date = statusBoundary.maxDate
        hasChanges = true
      }

      if (nextRaster.datetime > statusBoundary.maxDateTime) {
        nextRaster.datetime = statusBoundary.maxDateTime
        hasChanges = true
      }

      const shouldUseForecastProducts =
        nextRaster.temporalMode === 'datetime'
          ? nextRaster.datetime > statusBoundary.boundaryDateTime
          : nextRaster.date > statusBoundary.boundaryDate

      const allowedProducts = shouldUseForecastProducts ? forecastProducts : [NRT_PRODUCT]

      if (!allowedProducts.includes(nextRaster.product)) {
        nextRaster.product = allowedProducts[0]
        hasChanges = true
      }

      if (!hasChanges) {
        return current
      }

      return {
        ...current,
        raster: nextRaster,
      }
    })
  }, [
    appState.raster.date,
    appState.raster.datetime,
    appState.raster.product,
    appState.raster.temporalMode,
    statusBoundary.boundaryDate,
    statusBoundary.boundaryDateTime,
    statusBoundary.maxDate,
    statusBoundary.maxDateTime,
  ])

  const selectedBasemap = BASEMAPS.find((item) => item.id === appState.basemapId) ?? BASEMAPS[0]
  const selectedVariable =
    RASTER_VARIABLES[appState.raster.variable] ?? RASTER_VARIABLES[DEFAULT_RASTER_VARIABLE]
  const temporalMode = getTemporalModeForTimestep(selectedVariable.timestep)
  const center = parseCenter(appState.view.center)
  const viewState = {
    longitude: center.longitude,
    latitude: center.latitude,
    zoom: parseNumericValue(appState.view.zoom, Number.parseFloat(DEFAULT_STATE.view.zoom)),
    bearing: parseNumericValue(appState.view.bearing, Number.parseFloat(DEFAULT_STATE.view.bearing)),
    pitch: parseNumericValue(appState.view.pitch, Number.parseFloat(DEFAULT_STATE.view.pitch)),
  }
  const terrainEnabled = selectedBasemap.terrainAvailable && appState.terrainEnabled
  useEffect(() => {
    setAppState((current) =>
      current.raster.temporalMode === temporalMode
        ? current
        : {
            ...current,
            raster: {
              ...current.raster,
              date:
                temporalMode === 'date'
                  ? getDatePartFromDateTime(current.raster.datetime, current.raster.date)
                  : current.raster.date,
              datetime:
                temporalMode === 'datetime'
                  ? mergeDateIntoDateTime(current.raster.date, current.raster.datetime)
                  : current.raster.datetime,
              temporalMode,
            },
          },
    )
  }, [temporalMode])

  function updateTopLevel(key, value) {
    setAppState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updateRaster(key, value) {
    setAppState((current) => {
      const nextRaster = {
        ...current.raster,
        [key]: value,
      }

      if (key === 'date') {
        nextRaster.datetime = mergeDateIntoDateTime(value, current.raster.datetime)
      }

      if (key === 'datetime') {
        nextRaster.date = getDatePartFromDateTime(value, current.raster.date)
      }

      if (key === 'variable') {
        const nextVariable = RASTER_VARIABLES[value] ?? RASTER_VARIABLES[DEFAULT_RASTER_VARIABLE]
        const nextTemporalMode = getTemporalModeForTimestep(nextVariable.timestep)
        nextRaster.temporalMode = nextTemporalMode

        if (nextTemporalMode === 'datetime') {
          nextRaster.datetime = mergeDateIntoDateTime(current.raster.date, current.raster.datetime)
        }

        if (nextTemporalMode === 'date') {
          nextRaster.date = getDatePartFromDateTime(current.raster.datetime, current.raster.date)
        }
      }

      return {
        ...current,
        raster: nextRaster,
      }
    })
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

  function refreshBookmarkUrl() {
    const nextBookmarkUrl = writeStateToUrl(appState)
    setBookmarkUrl(nextBookmarkUrl)
    return nextBookmarkUrl
  }

  async function handleCopyBookmark() {
    try {
      const nextBookmarkUrl = refreshBookmarkUrl()
      await navigator.clipboard.writeText(nextBookmarkUrl)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  return (
    <div className="app-shell">
      <main className="map-stage">
        <MapCanvas
          appState={appState}
          basemapMenuRef={basemapMenuRef}
          basemapMenuOpen={basemapMenuOpen}
          bookmarkOpen={bookmarkOpen}
          bookmarkWidgetRef={bookmarkWidgetRef}
          copyStatus={copyStatus}
          layerMenuOpen={layerMenuOpen}
          layerMenuRef={layerMenuRef}
          onCloseBookmark={() => setBookmarkOpen(false)}
          onCopyBookmark={handleCopyBookmark}
          onToggleBookmark={() => {
            setBookmarkOpen((current) => {
              if (!current) {
                refreshBookmarkUrl()
              }
              return !current
            })
          }}
          bookmarkUrl={bookmarkUrl}
          selectedBasemap={selectedBasemap}
          selectedStation={selectedStation}
          selectedVariable={selectedVariable}
          setAppState={setAppState}
          setBasemapMenuOpen={setBasemapMenuOpen}
          setLayerMenuOpen={setLayerMenuOpen}
          setSelectedStation={setSelectedStation}
          statusBoundary={statusBoundary}
          terrainEnabled={terrainEnabled}
          toggleLayer={toggleLayer}
          updateRaster={updateRaster}
          updateTopLevel={updateTopLevel}
          viewState={viewState}
        />
      </main>
    </div>
  )
}

export default App

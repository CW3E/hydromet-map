import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import 'react-datepicker/dist/react-datepicker.css'
import './App.css'
import { BASEMAPS, DEFAULT_STATE, RASTER_VARIABLES } from './config/mapConfig'
import MapCanvas from './components/map/MapCanvas'
import {
  getTemporalModeForTimestep,
  parseCenter,
  parseNumericValue,
  readStateFromUrl,
  writeStateToUrl,
} from './lib/appState'

function App() {
  const [appState, setAppState] = useState(() => readStateFromUrl())
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [copyStatus, setCopyStatus] = useState('Copy URL')
  const [selectedStation, setSelectedStation] = useState(null)
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const [mouseCoordinates, setMouseCoordinates] = useState(null)
  const bookmarkWidgetRef = useRef(null)
  const layerMenuRef = useRef(null)

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
    if (!layerMenuOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!layerMenuRef.current?.contains(event.target)) {
        setLayerMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [layerMenuOpen])

  const selectedBasemap = BASEMAPS.find((item) => item.id === appState.basemapId) ?? BASEMAPS[0]
  const selectedVariable = RASTER_VARIABLES[appState.raster.variable] ?? RASTER_VARIABLES.precipitation
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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bookmarkUrl)}`

  useEffect(() => {
    setAppState((current) =>
      current.raster.temporalMode === temporalMode
        ? current
        : {
            ...current,
            raster: {
              ...current.raster,
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

      if (key === 'variable') {
        const nextVariable = RASTER_VARIABLES[value] ?? RASTER_VARIABLES.precipitation
        nextRaster.temporalMode = getTemporalModeForTimestep(nextVariable.timestep)
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

  function handleMapMouseMove(event) {
    setMouseCoordinates({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
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
      <main className="map-stage">
        <MapCanvas
          appState={appState}
          basemapMenuOpen={basemapMenuOpen}
          bookmarkOpen={bookmarkOpen}
          bookmarkWidgetRef={bookmarkWidgetRef}
          copyStatus={copyStatus}
          layerMenuOpen={layerMenuOpen}
          layerMenuRef={layerMenuRef}
          mouseCoordinates={mouseCoordinates}
          onCloseBookmark={() => setBookmarkOpen(false)}
          onCopyBookmark={handleCopyBookmark}
          onMouseMove={handleMapMouseMove}
          onToggleBookmark={() => setBookmarkOpen((current) => !current)}
          qrCodeUrl={qrCodeUrl}
          selectedBasemap={selectedBasemap}
          selectedStation={selectedStation}
          selectedVariable={selectedVariable}
          setAppState={setAppState}
          setBasemapMenuOpen={setBasemapMenuOpen}
          setLayerMenuOpen={setLayerMenuOpen}
          setSelectedStation={setSelectedStation}
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

import Map, { Layer, NavigationControl, Popup, ScaleControl, Source } from 'react-map-gl/maplibre'
import { BASEMAP_STYLES } from '../../config/mapConfig'
import {
  FORECAST_GEOJSON,
  RADAR_GEOJSON,
  RIVERS_GEOJSON,
  STATIONS_GEOJSON,
  WATERSHEDS_GEOJSON,
} from '../../data/demoOverlays'
import { formatCoordinate, formatViewValue } from '../../lib/appState'
import BookmarkControl from './BookmarkControl'
import GlobeProjectionControl from './GlobeProjectionControl'
import MapHud from './MapHud'
import MapLegend from './MapLegend'
import MouseReadout from './MouseReadout'
import TerrainToggleControl from './TerrainToggleControl'

export default function MapCanvas({
  appState,
  basemapMenuOpen,
  bookmarkOpen,
  bookmarkWidgetRef,
  copyStatus,
  layerMenuOpen,
  layerMenuRef,
  mouseCoordinates,
  onCloseBookmark,
  onCopyBookmark,
  onMouseMove,
  onToggleBookmark,
  qrCodeUrl,
  selectedBasemap,
  selectedStation,
  selectedVariable,
  setAppState,
  setBasemapMenuOpen,
  setLayerMenuOpen,
  setSelectedStation,
  terrainEnabled,
  toggleLayer,
  updateRaster,
  updateTopLevel,
  viewState,
}) {
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

  return (
    <section className="map-canvas">
      <Map
        {...viewState}
        attributionControl={false}
        interactiveLayerIds={appState.layers.stations ? ['stations-hit-layer'] : []}
        mapStyle={BASEMAP_STYLES[appState.basemapId]}
        projection={appState.projection}
        reuseMaps
        onClick={handleMapClick}
        onMouseMove={onMouseMove}
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

      <MapHud
        appState={appState}
        basemapMenuOpen={basemapMenuOpen}
        layerMenuOpen={layerMenuOpen}
        layerMenuRef={layerMenuRef}
        selectedBasemap={selectedBasemap}
        setBasemapMenuOpen={setBasemapMenuOpen}
        setLayerMenuOpen={setLayerMenuOpen}
        toggleLayer={toggleLayer}
        updateRaster={updateRaster}
        updateTopLevel={updateTopLevel}
      />

      {appState.layers.forecast ? (
        <MapLegend
          palette={selectedVariable.palette}
          units={selectedVariable.units}
          variableLabel={selectedVariable.label}
        />
      ) : null}

      <MouseReadout mouseCoordinates={mouseCoordinates} />

      <BookmarkControl
        bookmarkOpen={bookmarkOpen}
        bookmarkWidgetRef={bookmarkWidgetRef}
        copyStatus={copyStatus}
        onClose={onCloseBookmark}
        onCopy={onCopyBookmark}
        onToggle={onToggleBookmark}
        qrCodeUrl={qrCodeUrl}
      />
    </section>
  )
}

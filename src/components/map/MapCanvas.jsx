import { useState } from 'react'
import Map, { Layer, NavigationControl, Popup, ScaleControl, Source } from 'react-map-gl/maplibre'
import {
  BASEMAP_STYLES,
  FORECAST_BASINS_PMTILES_URL,
  FORECAST_BASINS_SOURCE_LAYER,
  RIVER_NETWORK_PMTILES_URL,
  RIVER_NETWORK_SOURCE_LAYER,
} from '../../config/mapConfig'
import { FORECAST_GEOJSON } from '../../data/demoOverlays'
import { formatCoordinate, formatViewValue } from '../../lib/appState'
import BookmarkControl from './BookmarkControl'
import GlobeProjectionControl from './GlobeProjectionControl'
import MapHud from './MapHud'
import MapLegend from './MapLegend'
import MouseReadout from './MouseReadout'
import TerrainToggleControl from './TerrainToggleControl'

const STATIONS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/fcst_points.geojson'
const CNRFC_REGION_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/cnrfc_line.geojson'
const SNOW_COURSES_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/snowcourse.geojson'
const SNOW_PILLOWS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/snowpillow.geojson'
const SNOW_POINT_RADIUS = ['interpolate', ['linear'], ['zoom'], 0, 2, 5, 2, 6, 3, 12, 6]
const SNOW_POINT_HIGHLIGHT_RADIUS = ['interpolate', ['linear'], ['zoom'], 0, 3, 5, 3, 6, 4, 12, 7]

export default function MapCanvas({
  appState,
  basemapMenuRef,
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
  const [hoveredRiver, setHoveredRiver] = useState(null)
  const [hoveredStation, setHoveredStation] = useState(null)
  const [hoveredSnowStation, setHoveredSnowStation] = useState(null)

  const interactiveLayerIds = [
    ...(appState.layers.rivers ? ['rivers-line'] : []),
    ...(appState.layers.stations ? ['stations-hit-layer'] : []),
    ...(appState.layers.snowCourses ? ['snow-courses-hit-layer'] : []),
    ...(appState.layers.snowPillows ? ['snow-pillows-hit-layer'] : []),
  ]

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

  function handlePointerMove(event) {
    onMouseMove(event)

    const hoveredRiverFeature = event.features?.find((feature) => feature.layer.id === 'rivers-line')
    const hoveredStationFeature = event.features?.find(
      (feature) => feature.layer.id === 'stations-hit-layer',
    )
    const hoveredSnowFeature = event.features?.find(
      (feature) =>
        feature.layer.id === 'snow-courses-hit-layer' || feature.layer.id === 'snow-pillows-hit-layer',
    )

    if (hoveredStationFeature) {
      const properties = hoveredStationFeature.properties ?? {}
      const location = properties.Location || 'Unknown'
      const locationParts = location.split(' - ')

      setHoveredStation({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        id: properties.ID ?? 'Unknown',
        river: properties.River || 'Unknown',
        location: locationParts.length > 1 ? locationParts.slice(1).join(' - ') : location,
        reachId: properties.ReachID ?? 'Unknown',
      })
    } else {
      setHoveredStation(null)
    }

    if (hoveredSnowFeature) {
      const properties = hoveredSnowFeature.properties ?? {}

      setHoveredSnowStation({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        sta: properties.STA ?? 'Unknown',
        stationName: properties.StationName || 'Unknown',
        elevation: properties.Elevation ?? 'Unknown',
        basinName: properties.BasinName || 'Unknown',
        hydroArea: properties.HydroArea || 'Unknown',
        layerId: hoveredSnowFeature.layer.id,
      })
    } else {
      setHoveredSnowStation(null)
    }

    if (!hoveredRiverFeature) {
      setHoveredRiver(null)
    } else {
      const properties = hoveredRiverFeature.properties ?? {}
      const rawLength = Number.parseFloat(properties.Shape_Length)
      const hasValidLength = Number.isFinite(rawLength)

      setHoveredRiver({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        featureId: properties.feature_id ?? 'Unknown',
        name: properties.gnis_name || 'Unnamed',
        source: properties.source || 'Unknown',
        lengthKm: hasValidLength ? (rawLength * 111.1).toFixed(1) : null,
        streamOrder: properties.stream_order ?? 'Unknown',
      })
    }
  }

  function handleMapClick(event) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'stations-hit-layer')

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
      setSelectedStation(null)
      return
    }

    setSelectedStation({
      id: clickedFeature.properties.ID,
      name: clickedFeature.properties.Location,
      river: clickedFeature.properties.River,
      reachId: clickedFeature.properties.ReachID,
      longitude: clickedFeature.geometry.coordinates[0],
      latitude: clickedFeature.geometry.coordinates[1],
    })
  }

  return (
    <section className="map-canvas">
      <Map
        {...viewState}
        attributionControl={false}
        interactiveLayerIds={interactiveLayerIds}
        mapStyle={BASEMAP_STYLES[appState.basemapId]}
        projection={appState.projection}
        reuseMaps
        onClick={handleMapClick}
        onMouseLeave={() => {
          setHoveredRiver(null)
          setHoveredStation(null)
          setHoveredSnowStation(null)
        }}
        onMouseMove={handlePointerMove}
        onMove={handleMapMove}
        style={{ width: '100%', height: '100%' }}
      >
        {appState.layers.watersheds ? (
          <Source
            id="watersheds-source"
            type="vector"
            url={`pmtiles://${FORECAST_BASINS_PMTILES_URL}`}
          >
            <Layer
              id="watersheds-fill"
              type="fill"
              source-layer={FORECAST_BASINS_SOURCE_LAYER}
              filter={['==', ['get', 'Basin'], hoveredStation?.id ?? '__none__']}
              paint={{
                'fill-color': '#2563eb',
                'fill-opacity': 0.16,
              }}
            />
            <Layer
              id="watersheds-outline"
              type="line"
              source-layer={FORECAST_BASINS_SOURCE_LAYER}
              filter={['==', ['get', 'Basin'], hoveredStation?.id ?? '__none__']}
              paint={{
                'line-color': '#2563eb',
                'line-width': 2,
                'line-opacity': 0.9,
              }}
            />
          </Source>
        ) : null}

        {appState.layers.rivers ? (
          <Source id="rivers-source" type="vector" url={`pmtiles://${RIVER_NETWORK_PMTILES_URL}`}>
            <Layer
              id="rivers-line"
              type="line"
              source-layer={RIVER_NETWORK_SOURCE_LAYER}
              paint={{
                'line-color': '#008b8b',
                'line-opacity': 0.9,
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0,
                  ['-', ['get', 'stream_order'], 6],
                  1,
                  ['-', ['get', 'stream_order'], 6],
                  2,
                  ['-', ['get', 'stream_order'], 6],
                  3,
                  ['-', ['get', 'stream_order'], 5.5],
                  4,
                  ['-', ['get', 'stream_order'], 5],
                  5,
                  ['-', ['get', 'stream_order'], 5],
                  6,
                  ['-', ['get', 'stream_order'], 4],
                  7,
                  ['-', ['get', 'stream_order'], 3],
                  8,
                  ['-', ['get', 'stream_order'], 2],
                  9,
                  ['-', ['get', 'stream_order'], 1],
                  10,
                  ['-', ['get', 'stream_order'], 1],
                  11,
                  ['-', ['get', 'stream_order'], 1],
                  12,
                  ['+', ['get', 'stream_order'], 0],
                  13,
                  ['+', ['get', 'stream_order'], 1],
                ],
              }}
            />
            <Layer
              id="rivers-line-highlight"
              type="line"
              source-layer={RIVER_NETWORK_SOURCE_LAYER}
              filter={['==', ['get', 'feature_id'], hoveredRiver?.featureId ?? '__none__']}
              paint={{
                'line-color': '#c62828',
                'line-opacity': 0.95,
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0,
                  ['-', ['get', 'stream_order'], 6],
                  1,
                  ['-', ['get', 'stream_order'], 6],
                  2,
                  ['-', ['get', 'stream_order'], 6],
                  3,
                  ['-', ['get', 'stream_order'], 5.5],
                  4,
                  ['-', ['get', 'stream_order'], 5],
                  5,
                  ['-', ['get', 'stream_order'], 5],
                  6,
                  ['-', ['get', 'stream_order'], 4],
                  7,
                  ['-', ['get', 'stream_order'], 3],
                  8,
                  ['-', ['get', 'stream_order'], 2],
                  9,
                  ['-', ['get', 'stream_order'], 1],
                  10,
                  ['-', ['get', 'stream_order'], 1],
                  11,
                  ['-', ['get', 'stream_order'], 1],
                  12,
                  ['+', ['get', 'stream_order'], 0],
                  13,
                  ['+', ['get', 'stream_order'], 1],
                ],
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
                'fill-color': selectedVariable.palette.colors[selectedVariable.palette.colors.length - 1],
                'fill-opacity': 0.22,
              }}
            />
            <Layer
              id="forecast-outline"
              type="line"
              paint={{
                'line-color':
                  selectedVariable.palette.colors[selectedVariable.palette.colors.length - 2],
                'line-width': 2,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        ) : null}

        {appState.layers.cnrfcRegion ? (
          <Source id="cnrfc-region-source" type="geojson" data={CNRFC_REGION_GEOJSON_URL}>
            <Layer
              id="cnrfc-region-outline"
              type="line"
              paint={{
                'line-color': '#6b7280',
                'line-width': 3.5,
                'line-opacity': 0.95,
              }}
            />
          </Source>
        ) : null}

        {appState.layers.stations ? (
          <Source id="stations-source" type="geojson" data={STATIONS_GEOJSON_URL}>
            <Layer
              id="stations-layer"
              type="circle"
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 5, 3, 6, 4, 12, 8],
                'circle-color': '#2563eb',
                'circle-stroke-width': 0,
              }}
            />
            <Layer
              id="stations-highlight-layer"
              type="circle"
              filter={['==', ['get', 'ID'], hoveredStation?.id ?? '__none__']}
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 5, 4, 6, 5, 12, 9],
                'circle-color': '#c62828',
                'circle-stroke-width': 0,
              }}
            />
          </Source>
        ) : null}

        {appState.layers.stations ? (
          <Source id="stations-hit-source" type="geojson" data={STATIONS_GEOJSON_URL}>
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

        {appState.layers.snowCourses ? (
          <Source id="snow-courses-source" type="geojson" data={SNOW_COURSES_GEOJSON_URL}>
            <Layer
              id="snow-courses-layer"
              type="circle"
              paint={{
                'circle-radius': SNOW_POINT_RADIUS,
                'circle-color': '#8b4513',
                'circle-stroke-width': 0,
              }}
            />
            <Layer
              id="snow-courses-highlight-layer"
              type="circle"
              filter={['==', ['get', 'STA'], hoveredSnowStation?.layerId === 'snow-courses-hit-layer' ? hoveredSnowStation.sta : '__none__']}
              paint={{
                'circle-radius': SNOW_POINT_HIGHLIGHT_RADIUS,
                'circle-color': '#c62828',
                'circle-stroke-width': 0,
              }}
            />
          </Source>
        ) : null}

        {appState.layers.snowCourses ? (
          <Source id="snow-courses-hit-source" type="geojson" data={SNOW_COURSES_GEOJSON_URL}>
            <Layer
              id="snow-courses-hit-layer"
              type="circle"
              paint={{
                'circle-radius': 12,
                'circle-color': '#000000',
                'circle-opacity': 0,
              }}
            />
          </Source>
        ) : null}

        {appState.layers.snowPillows ? (
          <Source id="snow-pillows-source" type="geojson" data={SNOW_PILLOWS_GEOJSON_URL}>
            <Layer
              id="snow-pillows-layer"
              type="circle"
              paint={{
                'circle-radius': SNOW_POINT_RADIUS,
                'circle-color': '#ff8c00',
                'circle-stroke-width': 0,
              }}
            />
            <Layer
              id="snow-pillows-highlight-layer"
              type="circle"
              filter={['==', ['get', 'STA'], hoveredSnowStation?.layerId === 'snow-pillows-hit-layer' ? hoveredSnowStation.sta : '__none__']}
              paint={{
                'circle-radius': SNOW_POINT_HIGHLIGHT_RADIUS,
                'circle-color': '#c62828',
                'circle-stroke-width': 0,
              }}
            />
          </Source>
        ) : null}

        {appState.layers.snowPillows ? (
          <Source id="snow-pillows-hit-source" type="geojson" data={SNOW_PILLOWS_GEOJSON_URL}>
            <Layer
              id="snow-pillows-hit-layer"
              type="circle"
              paint={{
                'circle-radius': 12,
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
              <span>{selectedStation.river}</span>
              <p>Reach ID: {selectedStation.reachId}</p>
            </div>
          </Popup>
        ) : null}

        {hoveredStation ? (
          <Popup
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            latitude={hoveredStation.latitude}
            longitude={hoveredStation.longitude}
            offset={10}
          >
            <div className="river-popup">
              <strong>ID: {hoveredStation.id}</strong>
              <p>River: {hoveredStation.river}</p>
              <p>Location: {hoveredStation.location}</p>
              <p>Matching NWM Reach: {hoveredStation.reachId}</p>
            </div>
          </Popup>
        ) : null}

        {hoveredSnowStation ? (
          <Popup
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            latitude={hoveredSnowStation.latitude}
            longitude={hoveredSnowStation.longitude}
            offset={10}
          >
            <div className="river-popup">
              <strong>Station ID: {hoveredSnowStation.sta}</strong>
              <p>Station Name: {hoveredSnowStation.stationName}</p>
              <p>Elevation: {hoveredSnowStation.elevation} ft</p>
              <p>Basin Name: {hoveredSnowStation.basinName}</p>
              <p>Hydro Area: {hoveredSnowStation.hydroArea}</p>
            </div>
          </Popup>
        ) : null}

        {hoveredRiver ? (
          <Popup
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            latitude={hoveredRiver.latitude}
            longitude={hoveredRiver.longitude}
            offset={10}
          >
            <div className="river-popup">
              <strong>River ID: {hoveredRiver.featureId}</strong>
              <p>Name: {hoveredRiver.name}</p>
              <p>Source: {hoveredRiver.source}</p>
              <p>
                Length: {hoveredRiver.lengthKm ?? 'Unknown'}{hoveredRiver.lengthKm ? ' km' : ''}
              </p>
              <p>Stream Order: {hoveredRiver.streamOrder}</p>
            </div>
          </Popup>
        ) : null}
      </Map>

      <MapHud
        appState={appState}
        basemapMenuRef={basemapMenuRef}
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

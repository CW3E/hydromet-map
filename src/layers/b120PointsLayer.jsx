import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import {
  createSelectedB120PointPopupState,
} from '../features/b120PointPopup/b120PointPopupData'
import { applyBookmarkedPopupTab, findBookmarkFeatureAtPoint } from './bookmarkRestore'

const B120_POINTS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/b120/csv/b120_stations_24.geojson'
const B120_POINT_RADIUS = ['interpolate', ['linear'], ['zoom'], 0, 4, 5, 4, 6, 6, 12, 10]

function buildHoveredB120Point(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    stationId: properties.Station_ID ?? 'Unknown',
    basin: properties.Basin ?? 'Unknown',
    location: properties.Location ?? 'Unknown',
  }
}

const b120PointsLayer = {
  id: 'b120Points',
  stateKey: 'hoveredB120Point',
  isVisible: ({ appState }) => appState.layers.b120Points,
  getInteractiveLayerIds() {
    return ['b120-points-hit-layer']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'b120-points-hit-layer')
    const hoveredPoint = hoveredFeature ? buildHoveredB120Point(event, hoveredFeature) : null

    if (!hoveredPoint) {
      return {
        hoveredB120Point: null,
      }
    }

    return {
      hoveredB120Point: hoveredPoint,
    }
  },
  getPointerLeaveState() {
    return { hoveredB120Point: null }
  },
  handleClick({ event, setSelectedStation }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'b120-points-hit-layer')

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
      return false
    }

    const station = {
      ...createSelectedB120PointPopupState(clickedFeature),
      layerId: 'b120Points',
      popupOwnerId: 'b120Points',
    }

    setSelectedStation(station)

    return true
  },
  restorePopupFromBookmark({ bookmarkPopup, mapInstance, setSelectedStation }) {
    const feature = findBookmarkFeatureAtPoint({
      bookmarkPopup,
      getFeatureId: (item) => item.properties?.Station_ID,
      layerIds: ['b120-points-hit-layer'],
      mapInstance,
    })

    if (!feature || feature.geometry.type !== 'Point') {
      return false
    }

    setSelectedStation(
      applyBookmarkedPopupTab(
        {
          ...createSelectedB120PointPopupState(feature),
          layerId: 'b120Points',
          popupOwnerId: 'b120Points',
        },
        bookmarkPopup,
      ),
    )

    return true
  },
  renderLayers({ interactionState }) {
    return (
      <>
        <Source id="b120-points-source" type="geojson" data={B120_POINTS_GEOJSON_URL}>
          <Layer
            id="b120-points-layer"
            type="circle"
            paint={{
              'circle-radius': B120_POINT_RADIUS,
              'circle-color': '#00ffff',
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 1,
            }}
          />
          <Layer
            id="b120-points-highlight-layer"
            type="circle"
            filter={['==', ['get', 'Station_ID'], interactionState.hoveredB120Point?.stationId ?? '__none__']}
            paint={{
              'circle-radius': B120_POINT_RADIUS,
              'circle-color': '#c62828',
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 1,
            }}
          />
        </Source>

        <Source id="b120-points-hit-source" type="geojson" data={B120_POINTS_GEOJSON_URL}>
          <Layer
            id="b120-points-hit-layer"
            type="circle"
            paint={{
              'circle-radius': 14,
              'circle-color': '#000000',
              'circle-opacity': 0,
            }}
          />
        </Source>
      </>
    )
  },
  renderPopups({ interactionState }) {
    const hoveredB120Point = interactionState.hoveredB120Point

    return (
      <>
        {hoveredB120Point ? (
          <Popup
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            latitude={hoveredB120Point.latitude}
            longitude={hoveredB120Point.longitude}
            offset={10}
          >
            <div className="river-popup">
              <strong>ID: {hoveredB120Point.stationId}</strong>
              <p>Basin: {hoveredB120Point.basin}</p>
              <p>Location: {hoveredB120Point.location}</p>
            </div>
          </Popup>
        ) : null}
      </>
    )
  },
}

export default b120PointsLayer

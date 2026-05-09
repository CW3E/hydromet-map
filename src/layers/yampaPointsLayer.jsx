import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import YampaPointPopup from '../features/yampaPointPopup/YampaPointPopup'
import { createSelectedYampaPointPopupState } from '../features/yampaPointPopup/yampaPointPopupData'
import { applyBookmarkedPopupTab, findBookmarkFeatureAtPoint } from './bookmarkRestore'

const YAMPA_POINTS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/yampa/csv/yampa_points.geojson'
const YAMPA_POINT_RADIUS = ['interpolate', ['linear'], ['zoom'], 0, 3, 5, 3, 6, 4, 12, 6]

function buildHoveredYampaPoint(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    stationId: properties.station_id ?? 'Unknown',
    name: properties.name ?? 'Unknown',
    area: properties.area ?? 'Unknown',
    reachId: properties.reach_id ?? 'Unknown',
  }
}

const yampaPointsLayer = {
  id: 'yampaPoints',
  stateKey: 'hoveredYampaPoint',
  isVisible: ({ appState }) => appState.layers.yampaPoints,
  getInteractiveLayerIds() {
    return ['yampa-points-hit-layer']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'yampa-points-hit-layer')
    const hoveredPoint = hoveredFeature ? buildHoveredYampaPoint(event, hoveredFeature) : null

    return {
      hoveredYampaPoint: hoveredPoint,
    }
  },
  getPointerLeaveState() {
    return { hoveredYampaPoint: null }
  },
  handleClick({ event, setSelectedStation }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'yampa-points-hit-layer')

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
      return false
    }

    const station = {
      ...createSelectedYampaPointPopupState(clickedFeature),
      layerId: 'yampaPoints',
      popupOwnerId: 'yampaPoints',
    }

    setSelectedStation(station)

    return true
  },
  restorePopupFromBookmark({ bookmarkPopup, mapInstance, setSelectedStation }) {
    const feature = findBookmarkFeatureAtPoint({
      bookmarkPopup,
      getFeatureId: (item) => item.properties?.station_id,
      layerIds: ['yampa-points-hit-layer'],
      mapInstance,
    })

    if (!feature || feature.geometry.type !== 'Point') {
      return false
    }

    setSelectedStation(
      applyBookmarkedPopupTab(
        {
          ...createSelectedYampaPointPopupState(feature),
          layerId: 'yampaPoints',
          popupOwnerId: 'yampaPoints',
        },
        bookmarkPopup,
      ),
    )

    return true
  },
  renderLayers({ interactionState }) {
    return (
      <>
        <Source id="yampa-points-source" type="geojson" data={YAMPA_POINTS_GEOJSON_URL}>
          <Layer
            id="yampa-points-layer"
            type="circle"
            paint={{
              'circle-radius': YAMPA_POINT_RADIUS,
              'circle-color': '#00ffff',
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 1,
            }}
          />
          <Layer
            id="yampa-points-highlight-layer"
            type="circle"
            filter={['==', ['get', 'station_id'], interactionState.hoveredYampaPoint?.stationId ?? '__none__']}
            paint={{
              'circle-radius': YAMPA_POINT_RADIUS,
              'circle-color': '#c62828',
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 1,
            }}
          />
        </Source>

        <Source id="yampa-points-hit-source" type="geojson" data={YAMPA_POINTS_GEOJSON_URL}>
          <Layer
            id="yampa-points-hit-layer"
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
  renderPopups({ interactionState, selectedStation, setSelectedStation }) {
    const hoveredYampaPoint = interactionState.hoveredYampaPoint

    return (
      <>
        <YampaPointPopup
          selectedStation={selectedStation}
          setSelectedStation={setSelectedStation}
        />

        {hoveredYampaPoint ? (
          <Popup
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            latitude={hoveredYampaPoint.latitude}
            longitude={hoveredYampaPoint.longitude}
            offset={10}
          >
            <div className="river-popup">
              <strong>Station ID: {hoveredYampaPoint.stationId}</strong>
              <p>Name: {hoveredYampaPoint.name}</p>
              <p>
                Area: {hoveredYampaPoint.area} mi<sup>2</sup>
              </p>
              <p>NWM Reach ID: {hoveredYampaPoint.reachId}</p>
            </div>
          </Popup>
        ) : null}
      </>
    )
  },
}

export default yampaPointsLayer

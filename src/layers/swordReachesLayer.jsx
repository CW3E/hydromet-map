import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import { createSelectedGlobalReachPopupState } from '../features/globalReachPopup/globalReachPopupData'
import {
  SWORD_REACHES_PMTILES_URL,
  SWORD_REACHES_SOURCE_LAYER,
} from '../config/mapConfig'
import { applyBookmarkedPopupTab, findBookmarkFeatureAtPoint } from './bookmarkRestore'

const SWORD_REACHES_LINE_COLOR = [
  'case',
  ['==', ['get', 'dindex'], null],
  'darkgray',
  'blue',
]

const SWORD_REACHES_LINE_WIDTH = [
  'interpolate',
  ['linear'],
  ['zoom'],
  0,
  ['-', ['get', 'strm_order'], 4],
  1,
  ['-', ['get', 'strm_order'], 4],
  2,
  ['-', ['get', 'strm_order'], 3],
  3,
  ['-', ['get', 'strm_order'], 3],
  4,
  ['-', ['get', 'strm_order'], 3],
  5,
  ['-', ['get', 'strm_order'], 2],
  6,
  ['-', ['get', 'strm_order'], 1],
  7,
  ['-', ['get', 'strm_order'], 0],
  8,
  ['-', ['get', 'strm_order'], 0],
  9,
  ['+', ['get', 'strm_order'], 1],
  10,
  ['+', ['get', 'strm_order'], 2],
  11,
  ['+', ['get', 'strm_order'], 3],
  12,
  ['+', ['get', 'strm_order'], 4],
]

function formatNumber(value, digits) {
  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : 'Unknown'
}

function buildHoveredSwordReach(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    reachId: properties.reach_id ?? 'Unknown',
    reachIdV16: properties.reach_id_v16 ?? 'Unknown',
    riverName: properties.river_name ?? 'Unknown',
    reachLength: formatNumber(properties.reach_len, 1),
    slope: formatNumber(properties.slope, 3),
    facc: formatNumber(properties.facc, 1),
    width: formatNumber(properties.width, 1),
    maxWidth: formatNumber(properties.max_width, 1),
    swotOrbit: properties.swot_orbit ?? 'Unknown',
    streamOrder: properties.strm_order ?? 'Unknown',
    upstreamReachId: properties.rch_id_up ?? 'Unknown',
    downstreamReachId: properties.rch_id_dn ?? 'Unknown',
  }
}

const swordReachesLayer = {
  id: 'swordReaches',
  stateKey: 'hoveredSwordReach',
  isVisible: ({ appState }) => appState.layers.swordReaches,
  getInteractiveLayerIds() {
    return ['sword-reaches-line']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'sword-reaches-line')

    return {
      hoveredSwordReach: hoveredFeature ? buildHoveredSwordReach(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredSwordReach: null }
  },
  handleClick({ event, setSelectedStation }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'sword-reaches-line')

    if (!clickedFeature || clickedFeature.geometry.type !== 'LineString') {
      return false
    }

    setSelectedStation(
      createSelectedGlobalReachPopupState(clickedFeature, {
        layerId: 'swordReaches',
        popupOwnerId: 'swordReaches',
        hydrography: 'SWORD',
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      }),
    )

    return true
  },
  restorePopupFromBookmark({ bookmarkPopup, mapInstance, setSelectedStation }) {
    const feature = findBookmarkFeatureAtPoint({
      bookmarkPopup,
      getFeatureId: (item) => item.properties?.reach_id,
      layerIds: ['sword-reaches-line'],
      mapInstance,
    })

    if (!feature || feature.geometry.type !== 'LineString') {
      return false
    }

    setSelectedStation(
      applyBookmarkedPopupTab(
        createSelectedGlobalReachPopupState(feature, {
          layerId: 'swordReaches',
          popupOwnerId: 'swordReaches',
          hydrography: 'SWORD',
          longitude: bookmarkPopup.longitude,
          latitude: bookmarkPopup.latitude,
        }),
        bookmarkPopup,
      ),
    )

    return true
  },
  renderLayers({ interactionState }) {
    return (
      <Source id="sword-reaches-source" type="vector" url={`pmtiles://${SWORD_REACHES_PMTILES_URL}`}>
        <Layer
          id="sword-reaches-line"
          type="line"
          source-layer={SWORD_REACHES_SOURCE_LAYER}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
          paint={{
            'line-color': SWORD_REACHES_LINE_COLOR,
            'line-opacity': 0.9,
            'line-width': SWORD_REACHES_LINE_WIDTH,
          }}
        />
        <Layer
          id="sword-reaches-line-highlight"
          type="line"
          source-layer={SWORD_REACHES_SOURCE_LAYER}
          filter={['==', ['get', 'reach_id'], interactionState.hoveredSwordReach?.reachId ?? '__none__']}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
          paint={{
            'line-color': '#c62828',
            'line-opacity': 0.95,
            'line-width': SWORD_REACHES_LINE_WIDTH,
          }}
        />
      </Source>
    )
  },
  renderPopups({ interactionState, selectedStation, setSelectedStation }) {
    const hoveredSwordReach = interactionState.hoveredSwordReach

    return (
      <>
        {hoveredSwordReach ? (
          <Popup
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            latitude={hoveredSwordReach.latitude}
            longitude={hoveredSwordReach.longitude}
            offset={10}
          >
            <div className="river-popup">
              <strong>Reach ID (v17b): {hoveredSwordReach.reachId}</strong>
              <p>Reach ID (v16): {hoveredSwordReach.reachIdV16}</p>
              <p>River name: {hoveredSwordReach.riverName}</p>
              <p>Length: {hoveredSwordReach.reachLength} m</p>
              <p>Slope: {hoveredSwordReach.slope} m/km</p>
              <p>
                Flow Accumulation Area: {hoveredSwordReach.facc} km<sup>2</sup>
              </p>
              <p>Width: {hoveredSwordReach.width} m</p>
              <p>Maximum Width: {hoveredSwordReach.maxWidth} m</p>
              <p>SWOT Orbit: {hoveredSwordReach.swotOrbit}</p>
              <p>Stream Order: {hoveredSwordReach.streamOrder}</p>
              <p>Upstream Reach ID: {hoveredSwordReach.upstreamReachId}</p>
              <p>Downstream Reach ID: {hoveredSwordReach.downstreamReachId}</p>
            </div>
          </Popup>
        ) : null}
      </>
    )
  },
}

export default swordReachesLayer

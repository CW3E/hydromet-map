import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import { GSHA_PMTILES_URL, GSHA_SOURCE_LAYER } from '../config/mapConfig'
import { createSelectedGshaPopupState } from '../features/gshaPopup/gshaPopupData'
import {
  applyBookmarkedPopupTab,
  findBookmarkFeatureAtPoint,
} from './bookmarkRestore'

const GSHA_CIRCLE_RADIUS = [
  'interpolate',
  ['linear'],
  ['zoom'],
  0,
  ['-', ['get', 'order'], 2],
  1,
  ['-', ['get', 'order'], 2],
  2,
  ['-', ['get', 'order'], 2],
  3,
  ['-', ['get', 'order'], 1.5],
  4,
  ['-', ['get', 'order'], 1],
  5,
  ['-', ['get', 'order'], 1],
  6,
  ['+', ['get', 'order'], 0],
  7,
  ['+', ['get', 'order'], 1],
  8,
  ['+', ['get', 'order'], 2],
  9,
  ['+', ['get', 'order'], 3],
  10,
  ['+', ['get', 'order'], 3],
  11,
  ['+', ['get', 'order'], 4],
  12,
  ['+', ['get', 'order'], 5],
]

function formatNumber(value, digits) {
  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : 'Unknown'
}

function getStationShortName(stationName) {
  if (typeof stationName !== 'string' || !stationName.trim()) {
    return 'Unknown'
  }

  return stationName.split('_')[0] || stationName
}

function buildHoveredGsha(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    dindex: properties.dindex ?? 'Unknown',
    agency: properties.agency ?? 'Unknown',
    stationShortName: getStationShortName(properties.Sttn_Nm),
    watershedAreaKm2: formatNumber(properties.WatershedArea, 1),
    verification: properties.verification ?? 'Unknown',
    comid: properties.COMID ?? 'Unknown',
    upstreamAreaKm2: formatNumber(properties.uparea, 1),
  }
}

const gshaLayer = {
  id: 'gsha',
  stateKey: 'hoveredGsha',
  isVisible: ({ appState }) => appState.layers.gsha,
  getInteractiveLayerIds() {
    return ['gsha-hit-layer']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'gsha-hit-layer')

    return {
      hoveredGsha: hoveredFeature ? buildHoveredGsha(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredGsha: null }
  },
  handleClick({ event, setSelectedStation }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'gsha-hit-layer')

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
      return false
    }

    setSelectedStation(
      createSelectedGshaPopupState(clickedFeature, {
        layerId: 'gsha',
        popupOwnerId: 'gsha',
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      }),
    )

    return true
  },
  restorePopupFromBookmark({ bookmarkPopup, mapInstance, setSelectedStation }) {
    const feature = findBookmarkFeatureAtPoint({
      bookmarkPopup,
      getFeatureId: (item) => item.properties?.dindex,
      layerIds: ['gsha-hit-layer'],
      mapInstance,
    })

    if (!feature || feature.geometry.type !== 'Point') {
      return false
    }

    setSelectedStation(
      applyBookmarkedPopupTab(
        createSelectedGshaPopupState(feature, {
          layerId: 'gsha',
          popupOwnerId: 'gsha',
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
      <Source id="gsha-source" type="vector" url={`pmtiles://${GSHA_PMTILES_URL}`}>
        <Layer
          id="gsha-layer"
          type="circle"
          source-layer={GSHA_SOURCE_LAYER}
          paint={{
            'circle-radius': GSHA_CIRCLE_RADIUS,
            'circle-color': 'darkorange',
            'circle-opacity': 0.9,
          }}
        />
        <Layer
          id="gsha-label-layer"
          type="symbol"
          source-layer={GSHA_SOURCE_LAYER}
          minzoom={10}
          layout={{
            'text-field': ['format', ['get', 'agency'], {}, ' ', {}, ['get', 'Sttn'], {}],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
          }}
          paint={{
            'text-color': '#333',
            'text-halo-color': '#fff',
            'text-halo-width': 1,
          }}
        />
        <Layer
          id="gsha-highlight-layer"
          type="circle"
          source-layer={GSHA_SOURCE_LAYER}
          filter={['==', ['get', 'dindex'], interactionState.hoveredGsha?.dindex ?? '__none__']}
          paint={{
            'circle-radius': GSHA_CIRCLE_RADIUS,
            'circle-color': '#c62828',
            'circle-opacity': 0.95,
          }}
        />
        <Layer
          id="gsha-hit-layer"
          type="circle"
          source-layer={GSHA_SOURCE_LAYER}
          paint={{
            'circle-radius': 14,
            'circle-color': '#000000',
            'circle-opacity': 0,
          }}
        />
      </Source>
    )
  },
  renderPopups({ interactionState }) {
    const hoveredGsha = interactionState.hoveredGsha

    if (!hoveredGsha) {
      return null
    }

    return (
      <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredGsha.latitude}
        longitude={hoveredGsha.longitude}
        offset={10}
      >
        <div className="river-popup">
          <strong>
            {hoveredGsha.agency} {hoveredGsha.stationShortName} (GSHA #{hoveredGsha.dindex})
          </strong>
          <p>
            Watershed Area: {hoveredGsha.watershedAreaKm2} km<sup>2</sup>
          </p>
          <p>MERIT-Basins Reach ({hoveredGsha.verification}):</p>
          <p>&nbsp;&nbsp;&nbsp;&nbsp;COMID: {hoveredGsha.comid}</p>
          <p>
            &nbsp;&nbsp;&nbsp;&nbsp;Upstream Area: {hoveredGsha.upstreamAreaKm2} km<sup>2</sup>
          </p>
        </div>
      </Popup>
    )
  },
}

export default gshaLayer

import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import { OCWD_WELLS_PMTILES_URL, OCWD_WELLS_SOURCE_LAYER } from '../config/mapConfig'
import { createSelectedOcwdWellPopupState } from '../features/ocwdWellPopup/ocwdWellPopupData'
import {
  applyBookmarkedPopupTab,
  findBookmarkFeatureAtPoint,
} from './bookmarkRestore'

const OCWD_WELLS_RADIUS = ['interpolate', ['linear'], ['zoom'], 0, 1, 2, 3, 3, 4, 4, 4]
const OCWD_WELLS_COLOR = ['case', ['==', ['get', 'STATUSNM'], 'ACTIVE'], 'orange', 'darkgray']

function buildHoveredOcwdWell(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    stationId: properties.STAID1 ?? 'Unknown',
    name: properties.WELLNM ?? 'Unknown',
    owner: properties.OWNERNM ?? 'Unknown',
    user: properties.WELLUSENM ?? 'Unknown',
    status: properties.STATUSNM ?? 'Unknown',
  }
}

const ocwdWellsLayer = {
  id: 'ocwdWells',
  stateKey: 'hoveredOcwdWell',
  isVisible: ({ appState }) => appState.layers.ocwdWells,
  getInteractiveLayerIds() {
    return ['ocwd-wells-hit-layer']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'ocwd-wells-hit-layer')

    return {
      hoveredOcwdWell: hoveredFeature ? buildHoveredOcwdWell(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredOcwdWell: null }
  },
  handleClick({ event, setSelectedStation }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'ocwd-wells-hit-layer')

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
      return false
    }

    setSelectedStation(
      createSelectedOcwdWellPopupState(clickedFeature, {
        layerId: 'ocwdWells',
        popupOwnerId: 'ocwdWells',
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      }),
    )

    return true
  },
  restorePopupFromBookmark({ bookmarkPopup, mapInstance, setSelectedStation }) {
    const feature = findBookmarkFeatureAtPoint({
      bookmarkPopup,
      getFeatureId: (item) => item.properties?.STAID1,
      layerIds: ['ocwd-wells-hit-layer'],
      mapInstance,
    })

    if (!feature || feature.geometry.type !== 'Point') {
      return false
    }

    setSelectedStation(
      applyBookmarkedPopupTab(
        createSelectedOcwdWellPopupState(feature, {
          layerId: 'ocwdWells',
          popupOwnerId: 'ocwdWells',
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
      <Source id="ocwd-wells-source" type="vector" url={`pmtiles://${OCWD_WELLS_PMTILES_URL}`}>
        <Layer
          id="ocwd-wells-layer"
          type="circle"
          source-layer={OCWD_WELLS_SOURCE_LAYER}
          paint={{
            'circle-radius': OCWD_WELLS_RADIUS,
            'circle-color': OCWD_WELLS_COLOR,
            'circle-opacity': 0.95,
          }}
        />
        <Layer
          id="ocwd-wells-highlight-layer"
          type="circle"
          source-layer={OCWD_WELLS_SOURCE_LAYER}
          filter={['==', ['get', 'STAID1'], interactionState.hoveredOcwdWell?.stationId ?? '__none__']}
          paint={{
            'circle-radius': OCWD_WELLS_RADIUS,
            'circle-color': '#c62828',
            'circle-opacity': 1,
          }}
        />
        <Layer
          id="ocwd-wells-hit-layer"
          type="circle"
          source-layer={OCWD_WELLS_SOURCE_LAYER}
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
    const hoveredOcwdWell = interactionState.hoveredOcwdWell

    if (!hoveredOcwdWell) {
      return null
    }

    return (
      <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredOcwdWell.latitude}
        longitude={hoveredOcwdWell.longitude}
        offset={10}
      >
        <div className="river-popup">
          <p>Station ID: {hoveredOcwdWell.stationId}</p>
          <p>Name: {hoveredOcwdWell.name}</p>
          <p>Owner: {hoveredOcwdWell.owner}</p>
          <p>User: {hoveredOcwdWell.user}</p>
          <p>Status: {hoveredOcwdWell.status}</p>
        </div>
      </Popup>
    )
  },
}

export default ocwdWellsLayer

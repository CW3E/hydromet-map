import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import Cw3eMetObsPopup from '../features/cw3eMetObsPopup/Cw3eMetObsPopup'
import {
  createSelectedCw3eMetObsPopupState,
  loadCw3eMetObsPopupTabData,
} from '../features/cw3eMetObsPopup/cw3eMetObsPopupData'
import { getDefaultCw3eMetObsPopupTabId } from '../features/cw3eMetObsPopup/cw3eMetObsPopupConfig'
import { applyBookmarkedPopupTab, findBookmarkFeatureAtPoint } from './bookmarkRestore'

const CW3E_MET_OBS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cw3e_obs/csv/cdec_cw3e_stations.geojson'

function buildHoveredMetObservation(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    id: properties.ID ?? 'Unknown',
    stationName: properties['Station Name'] ?? 'Unknown',
    riverBasin: properties['River Basin'] ?? 'Unknown',
    county: properties.County ?? 'Unknown',
    elevationFeet: properties.ElevationFeet ?? 'Unknown',
  }
}

const cw3eMetObsLayer = {
  id: 'cw3eMetObs',
  stateKey: 'hoveredCw3eMetObs',
  isVisible: ({ appState }) => appState.layers.cw3eMetObs,
  getInteractiveLayerIds() {
    return ['cw3e-met-obs-hit-layer']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find(
      (feature) => feature.layer.id === 'cw3e-met-obs-hit-layer',
    )

    return {
      hoveredCw3eMetObs: hoveredFeature
        ? buildHoveredMetObservation(event, hoveredFeature)
        : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredCw3eMetObs: null }
  },
  handleClick({ event, setSelectedStation }) {
    const clickedFeature = event.features?.find(
      (feature) => feature.layer.id === 'cw3e-met-obs-hit-layer',
    )

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') return false

    const station = createSelectedCw3eMetObsPopupState(clickedFeature, {
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
    })
    setSelectedStation(station)
    loadCw3eMetObsPopupTabData(setSelectedStation, station, getDefaultCw3eMetObsPopupTabId())
    return true
  },
  restorePopupFromBookmark({ bookmarkPopup, mapInstance, setSelectedStation }) {
    const feature = findBookmarkFeatureAtPoint({
      bookmarkPopup,
      getFeatureId: (item) => item.properties?.ID,
      layerIds: ['cw3e-met-obs-hit-layer'],
      mapInstance,
    })
    if (!feature || feature.geometry.type !== 'Point') return false

    const station = applyBookmarkedPopupTab(
      createSelectedCw3eMetObsPopupState(feature, {
        longitude: bookmarkPopup.longitude,
        latitude: bookmarkPopup.latitude,
      }),
      bookmarkPopup,
    )
    setSelectedStation(station)
    loadCw3eMetObsPopupTabData(setSelectedStation, station, station.popup.activeTabId)
    return true
  },
  renderLayers({ interactionState }) {
    return (
      <>
        <Source id="cw3e-met-obs-source" type="geojson" data={CW3E_MET_OBS_GEOJSON_URL}>
          <Layer
            id="cw3e-met-obs-layer"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 5, 3, 6, 4, 12, 8],
              'circle-color': '#000080',
              'circle-stroke-width': 0,
            }}
          />
          <Layer
            id="cw3e-met-obs-label-layer"
            type="symbol"
            layout={{
              'text-field': ['get', 'ID'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 11,
              'text-offset': [0, 1],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-ignore-placement': false,
            }}
            paint={{
              'text-color': '#000080',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1,
            }}
          />
          <Layer
            id="cw3e-met-obs-highlight-layer"
            type="circle"
            filter={['==', ['get', 'ID'], interactionState.hoveredCw3eMetObs?.id ?? '__none__']}
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 5, 4, 6, 5, 12, 9],
              'circle-color': '#c62828',
              'circle-stroke-width': 0,
            }}
          />
        </Source>

        <Source id="cw3e-met-obs-hit-source" type="geojson" data={CW3E_MET_OBS_GEOJSON_URL}>
          <Layer
            id="cw3e-met-obs-hit-layer"
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
    const hoveredMetObservation = interactionState.hoveredCw3eMetObs

    return (
      <>
        <Cw3eMetObsPopup
          selectedStation={selectedStation}
          setSelectedStation={setSelectedStation}
        />
        {hoveredMetObservation ? <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredMetObservation.latitude}
        longitude={hoveredMetObservation.longitude}
        offset={10}
      >
        <div className="river-popup">
          <strong>ID: {hoveredMetObservation.id}</strong>
          <p>Station Name: {hoveredMetObservation.stationName}</p>
          <p>River Basin: {hoveredMetObservation.riverBasin}</p>
          <p>County: {hoveredMetObservation.county}</p>
          <p>ElevationFeet: {hoveredMetObservation.elevationFeet}</p>
        </div>
        </Popup> : null}
      </>
    )
  },
}

export default cw3eMetObsLayer

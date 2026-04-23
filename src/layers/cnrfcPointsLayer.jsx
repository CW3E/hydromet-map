import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import CnrfcPointPopup from '../features/cnrfcPointPopup/CnrfcPointPopup'
import {
  createSelectedCnrfcPointPopupState,
  loadCnrfcPointPopupTabData,
} from '../features/cnrfcPointPopup/cnrfcPointPopupData'
import { getDefaultCnrfcPointPopupTabId } from '../features/cnrfcPointPopup/cnrfcPointPopupConfig'

const CNRFC_POINTS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/fcst_points.geojson'

function buildHoveredCnrfcPoint(event, feature) {
  const properties = feature?.properties ?? {}
  const location = properties.Location || 'Unknown'
  const locationParts = location.split(' - ')

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    id: properties.ID ?? 'Unknown',
    river: properties.River || 'Unknown',
    location: locationParts.length > 1 ? locationParts.slice(1).join(' - ') : location,
    reachId: properties.ReachID ?? 'Unknown',
    wrfHydroAvailable: properties.wrf_hydro_available === 'true',
  }
}

const cnrfcPointsLayer = {
  id: 'cnrfcPoints',
  stateKey: 'hoveredCnrfcPoint',
  isVisible: ({ appState }) => appState.layers.cnrfcPoints,
  getInteractiveLayerIds() {
    return ['stations-hit-layer']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'stations-hit-layer')

    return {
      hoveredCnrfcPoint: hoveredFeature ? buildHoveredCnrfcPoint(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredCnrfcPoint: null }
  },
  handleClick({ event, setSelectedStation, statusBoundary }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'stations-hit-layer')

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
      return false
    }

    const station = createSelectedCnrfcPointPopupState(clickedFeature, {
      statusTimestamp: statusBoundary?.statusTimestamp ?? null,
    })

    setSelectedStation(station)
    loadCnrfcPointPopupTabData(setSelectedStation, station, getDefaultCnrfcPointPopupTabId())

    return true
  },
  renderLayers({ interactionState }) {
    return (
      <>
        <Source id="stations-source" type="geojson" data={CNRFC_POINTS_GEOJSON_URL}>
          <Layer
            id="stations-layer"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 5, 3, 6, 4, 12, 8],
              'circle-color': [
                'case',
                ['==', ['get', 'wrf_hydro_available'], 'true'],
                '#2563eb',
                'darkgray',
              ],
              'circle-stroke-width': 0,
            }}
          />
          <Layer
            id="stations-highlight-layer"
            type="circle"
            filter={['==', ['get', 'ID'], interactionState.hoveredCnrfcPoint?.id ?? '__none__']}
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 5, 4, 6, 5, 12, 9],
              'circle-color': '#c62828',
              'circle-stroke-width': 0,
            }}
          />
        </Source>

        <Source id="stations-hit-source" type="geojson" data={CNRFC_POINTS_GEOJSON_URL}>
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
      </>
    )
  },
  renderPopups({ interactionState, selectedStation, setSelectedStation }) {
    return (
      <>
        <CnrfcPointPopup
          selectedStation={selectedStation}
          setSelectedStation={setSelectedStation}
        />

        {interactionState.hoveredCnrfcPoint ? (
          <Popup
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            latitude={interactionState.hoveredCnrfcPoint.latitude}
            longitude={interactionState.hoveredCnrfcPoint.longitude}
            offset={10}
          >
            <div className="river-popup">
              <strong>ID: {interactionState.hoveredCnrfcPoint.id}</strong>
              <p>River: {interactionState.hoveredCnrfcPoint.river}</p>
              <p>Location: {interactionState.hoveredCnrfcPoint.location}</p>
              <p>Matching NWM Reach: {interactionState.hoveredCnrfcPoint.reachId}</p>
              <p>WRF-Hydro Data Available: {interactionState.hoveredCnrfcPoint.wrfHydroAvailable ? 'Yes' : 'No'}</p>
            </div>
          </Popup>
        ) : null}
      </>
    )
  },
}

export default cnrfcPointsLayer

import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import StationPopup from '../features/stationPopup/StationPopup'
import {
  createSelectedStationPopupState,
  loadStationPopupTabData,
} from '../features/stationPopup/stationPopupData'
import { getDefaultStationPopupTabId } from '../features/stationPopup/stationPopupConfig'

const STATIONS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/fcst_points.geojson'

function buildHoveredStation(event, feature) {
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
  }
}

const stationsLayer = {
  id: 'stations',
  stateKey: 'hoveredStation',
  isVisible: ({ appState }) => appState.layers.stations,
  getInteractiveLayerIds() {
    return ['stations-hit-layer']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'stations-hit-layer')

    return {
      hoveredStation: hoveredFeature ? buildHoveredStation(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredStation: null }
  },
  handleClick({ event, setSelectedStation, statusBoundary }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'stations-hit-layer')

    if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
      setSelectedStation(null)
      return true
    }

    const station = createSelectedStationPopupState(clickedFeature, {
      statusTimestamp: statusBoundary?.statusTimestamp ?? null,
    })

    setSelectedStation(station)
    loadStationPopupTabData(setSelectedStation, station, getDefaultStationPopupTabId())

    return true
  },
  renderLayers({ interactionState }) {
    return (
      <>
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
            filter={['==', ['get', 'ID'], interactionState.hoveredStation?.id ?? '__none__']}
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 5, 4, 6, 5, 12, 9],
              'circle-color': '#c62828',
              'circle-stroke-width': 0,
            }}
          />
        </Source>

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
      </>
    )
  },
  renderPopups({ interactionState, selectedStation, setSelectedStation }) {
    return (
      <>
        <StationPopup
          selectedStation={selectedStation}
          setSelectedStation={setSelectedStation}
        />

        {interactionState.hoveredStation ? (
          <Popup
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            latitude={interactionState.hoveredStation.latitude}
            longitude={interactionState.hoveredStation.longitude}
            offset={10}
          >
            <div className="river-popup">
              <strong>ID: {interactionState.hoveredStation.id}</strong>
              <p>River: {interactionState.hoveredStation.river}</p>
              <p>Location: {interactionState.hoveredStation.location}</p>
              <p>Matching NWM Reach: {interactionState.hoveredStation.reachId}</p>
            </div>
          </Popup>
        ) : null}
      </>
    )
  },
}

export default stationsLayer

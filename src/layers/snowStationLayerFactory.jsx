import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import SnowStationPopup from '../features/snowStationPopup/SnowStationPopup'
import { getDefaultSnowPopupTabId } from '../features/snowStationPopup/snowStationPopupConfig'
import {
  createSelectedSnowStationPopupState,
  loadSnowStationPopupTabData,
} from '../features/snowStationPopup/snowStationPopupData'

const SNOW_POINT_RADIUS = ['interpolate', ['linear'], ['zoom'], 0, 2, 5, 2, 6, 3, 12, 6]
const SNOW_POINT_HIGHLIGHT_RADIUS = ['interpolate', ['linear'], ['zoom'], 0, 3, 5, 3, 6, 4, 12, 7]

function buildHoveredSnowStation(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    sta: properties.STA ?? 'Unknown',
    stationName: properties.StationName || 'Unknown',
    elevation: properties.Elevation ?? 'Unknown',
    basinName: properties.BasinName || 'Unknown',
    hydroArea: properties.HydroArea || 'Unknown',
  }
}

export default function createSnowStationLayer({
  id,
  sourceId,
  layerId,
  highlightLayerId,
  hitSourceId,
  hitLayerId,
  data,
  circleColor,
  popupDefinition,
  stateKey,
}) {
  return {
    id,
    stateKey,
    isVisible: ({ appState }) => appState.layers[id],
    getInteractiveLayerIds() {
      return [hitLayerId]
    },
    getPointerState({ event }) {
      const hoveredFeature = event.features?.find((feature) => feature.layer.id === hitLayerId)
      return {
        [stateKey]: hoveredFeature ? buildHoveredSnowStation(event, hoveredFeature) : null,
      }
    },
    getPointerLeaveState() {
      return { [stateKey]: null }
    },
    handleClick({ event, setSelectedStation, statusBoundary }) {
      const clickedFeature = event.features?.find((feature) => feature.layer.id === hitLayerId)

      if (!clickedFeature || clickedFeature.geometry.type !== 'Point') {
        return false
      }

      const station = createSelectedSnowStationPopupState(clickedFeature, popupDefinition, {
        statusTimestamp: statusBoundary?.statusTimestamp ?? null,
      })

      setSelectedStation(station)
      loadSnowStationPopupTabData(
        setSelectedStation,
        station,
        popupDefinition,
        getDefaultSnowPopupTabId(popupDefinition),
      )

      return true
    },
    renderLayers({ interactionState }) {
      const hoveredSnowStation = interactionState[stateKey]

      return (
        <>
          <Source id={sourceId} type="geojson" data={data}>
            <Layer
              id={layerId}
              type="circle"
              paint={{
                'circle-radius': SNOW_POINT_RADIUS,
                'circle-color': circleColor,
                'circle-stroke-width': 0,
              }}
            />
            <Layer
              id={highlightLayerId}
              type="circle"
              filter={['==', ['get', 'STA'], hoveredSnowStation?.sta ?? '__none__']}
              paint={{
                'circle-radius': SNOW_POINT_HIGHLIGHT_RADIUS,
                'circle-color': '#c62828',
                'circle-stroke-width': 0,
              }}
            />
          </Source>

          <Source id={hitSourceId} type="geojson" data={data}>
            <Layer
              id={hitLayerId}
              type="circle"
              paint={{
                'circle-radius': 12,
                'circle-color': '#000000',
                'circle-opacity': 0,
              }}
            />
          </Source>
        </>
      )
    },
    renderPopups({ interactionState, selectedStation, setSelectedStation }) {
      const hoveredSnowStation = interactionState[stateKey]

      return (
        <>
          <SnowStationPopup
            popupDefinition={popupDefinition}
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
          />

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
        </>
      )
    },
  }
}

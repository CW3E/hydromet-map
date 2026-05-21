import { Layer, Popup, Source } from 'react-map-gl/maplibre'

const PRADO_BASIN_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/ocwd/csv/OCWD_PradoBasin_Extent.geojson'

function buildHoveredPradoBasin(event) {
  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
  }
}

const pradoBasinLayer = {
  id: 'pradoBasin',
  stateKey: 'hoveredPradoBasin',
  isVisible: ({ appState }) => appState.layers.pradoBasin,
  getInteractiveLayerIds() {
    return ['prado-basin-fill']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'prado-basin-fill')

    return {
      hoveredPradoBasin: hoveredFeature ? buildHoveredPradoBasin(event) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredPradoBasin: null }
  },
  renderLayers({ interactionState }) {
    return (
      <Source id="prado-basin-source" type="geojson" data={PRADO_BASIN_GEOJSON_URL}>
        <Layer
          id="prado-basin-fill"
          type="fill"
          paint={{
            'fill-color': '#2563eb',
            'fill-opacity': 0,
          }}
        />
        <Layer
          id="prado-basin-outline"
          type="line"
          paint={{
            'line-color': '#8A2BE2',
            'line-width': 2,
            'line-opacity': 0.95,
          }}
        />
        {interactionState.hoveredPradoBasin ? (
          <Layer
            id="prado-basin-highlight"
            type="line"
            paint={{
              'line-color': '#c62828',
              'line-width': 3,
              'line-opacity': 1,
            }}
          />
        ) : null}
      </Source>
    )
  },
  renderPopups({ interactionState }) {
    const hoveredPradoBasin = interactionState.hoveredPradoBasin

    if (!hoveredPradoBasin) {
      return null
    }

    return (
      <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredPradoBasin.latitude}
        longitude={hoveredPradoBasin.longitude}
        offset={10}
      >
        <div className="river-popup">
          <strong>Prado Basin</strong>
        </div>
      </Popup>
    )
  },
}

export default pradoBasinLayer

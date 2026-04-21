import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import { MERIT_BASINS_PMTILES_URL, MERIT_BASINS_SOURCE_LAYER } from '../config/mapConfig'

const MERIT_BASINS_LINE_WIDTH = [
  'interpolate',
  ['linear'],
  ['zoom'],
  0,
  ['-', ['get', 'order'], 5],
  1,
  ['-', ['get', 'order'], 5],
  2,
  ['-', ['get', 'order'], 5],
  3,
  ['-', ['get', 'order'], 4.5],
  4,
  ['-', ['get', 'order'], 4],
  5,
  ['-', ['get', 'order'], 4],
  6,
  ['-', ['get', 'order'], 3],
  7,
  ['-', ['get', 'order'], 2],
  8,
  ['-', ['get', 'order'], 1],
  9,
  ['-', ['get', 'order'], 0],
  10,
  ['-', ['get', 'order'], 0],
  11,
  ['+', ['get', 'order'], 1],
  12,
  ['+', ['get', 'order'], 2],
]

function formatNumber(value, digits) {
  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : 'Unknown'
}

function formatSlopePermil(value) {
  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue) ? (numericValue * 1000).toFixed(3) : 'Unknown'
}

function buildHoveredMeritBasin(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    comid: properties.COMID ?? 'Unknown',
    lengthKm: formatNumber(properties.lengthkm, 1),
    lengthDirKm: formatNumber(properties.lengthdir, 1),
    sinuosity: formatNumber(properties.sinuosity, 2),
    slopePermil: formatSlopePermil(properties.slope),
    upstreamArea: formatNumber(properties.uparea, 1),
    order: Number.parseInt(properties.order, 10),
    nextDownId: properties.NextDownID ?? 'Unknown',
    maxup: Number.parseInt(properties.maxup, 10),
    up1: properties.up1 ?? 'Unknown',
    up2: properties.up2 ?? 'Unknown',
    up3: properties.up3 ?? 'Unknown',
    up4: properties.up4 ?? 'Unknown',
  }
}

const meritBasinsLayer = {
  id: 'meritBasins',
  stateKey: 'hoveredMeritBasin',
  isVisible: ({ appState }) => appState.layers.meritBasins,
  getInteractiveLayerIds() {
    return ['merit-basins-line']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'merit-basins-line')

    return {
      hoveredMeritBasin: hoveredFeature ? buildHoveredMeritBasin(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredMeritBasin: null }
  },
  renderLayers({ interactionState }) {
    return (
      <Source id="merit-basins-source" type="vector" url={`pmtiles://${MERIT_BASINS_PMTILES_URL}`}>
        <Layer
          id="merit-basins-line"
          type="line"
          source-layer={MERIT_BASINS_SOURCE_LAYER}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
          paint={{
            'line-color': '#00ced1',
            'line-opacity': 0.9,
            'line-width': MERIT_BASINS_LINE_WIDTH,
          }}
        />
        <Layer
          id="merit-basins-line-highlight"
          type="line"
          source-layer={MERIT_BASINS_SOURCE_LAYER}
          filter={['==', ['get', 'COMID'], interactionState.hoveredMeritBasin?.comid ?? '__none__']}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
          paint={{
            'line-color': '#c62828',
            'line-opacity': 0.95,
            'line-width': MERIT_BASINS_LINE_WIDTH,
          }}
        />
      </Source>
    )
  },
  renderPopups({ interactionState }) {
    const hoveredMeritBasin = interactionState.hoveredMeritBasin

    if (!hoveredMeritBasin) {
      return null
    }

    return (
      <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredMeritBasin.latitude}
        longitude={hoveredMeritBasin.longitude}
        offset={10}
      >
        <div className="river-popup">
          <strong>COMID: {hoveredMeritBasin.comid}</strong>
          <p>Length: {hoveredMeritBasin.lengthKm} km</p>
          <p>Start-to-end Distance: {hoveredMeritBasin.lengthDirKm} km</p>
          <p>Sinuosity: {hoveredMeritBasin.sinuosity}</p>
          <p>Slope: {hoveredMeritBasin.slopePermil}&permil;</p>
          <p>
            Upstream Area: {hoveredMeritBasin.upstreamArea} km<sup>2</sup>
          </p>
          <p>Stream Order: {Number.isFinite(hoveredMeritBasin.order) ? hoveredMeritBasin.order : 'Unknown'}</p>
          <p>Downstream COMID: {hoveredMeritBasin.nextDownId}</p>
          {Number.isFinite(hoveredMeritBasin.order) && hoveredMeritBasin.order > 1 ? (
            <>
              <p>Upstream COMID 1: {hoveredMeritBasin.up1}</p>
              <p>Upstream COMID 2: {hoveredMeritBasin.up2}</p>
            </>
          ) : null}
          {Number.isFinite(hoveredMeritBasin.maxup) && hoveredMeritBasin.maxup > 2 ? (
            <p>Upstream COMID 3: {hoveredMeritBasin.up3}</p>
          ) : null}
          {Number.isFinite(hoveredMeritBasin.maxup) && hoveredMeritBasin.maxup > 3 ? (
            <p>Upstream COMID 4: {hoveredMeritBasin.up4}</p>
          ) : null}
        </div>
      </Popup>
    )
  },
}

export default meritBasinsLayer

import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import {
  GRADES_HYDRODL_PMTILES_URL,
  MERIT_BASINS_SOURCE_LAYER,
} from '../config/mapConfig'

const GRADES_HYDRODL_LINE_WIDTH = [
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

const GRADES_HYDRODL_LINE_COLOR = [
  'match',
  ['get', 'pctl_range'],
  0,
  'sienna',
  1,
  'goldenrod',
  2,
  'olive',
  3,
  'darkgreen',
  4,
  'darkcyan',
  5,
  'darkblue',
  6,
  'darkmagenta',
  7,
  'magenta',
  'gray',
]

function formatNumber(value, digits) {
  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : 'Unknown'
}

function formatSlopePermil(value) {
  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue) ? (numericValue * 1000).toFixed(3) : 'Unknown'
}

function buildHoveredGradesHydroDl(event, feature) {
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

const gradesHydroDlLayer = {
  id: 'gradesHydroDl',
  stateKey: 'hoveredGradesHydroDl',
  isVisible: ({ appState }) => appState.layers.gradesHydroDl,
  getInteractiveLayerIds() {
    return ['grades-hydrodl-line']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'grades-hydrodl-line')

    return {
      hoveredGradesHydroDl: hoveredFeature ? buildHoveredGradesHydroDl(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredGradesHydroDl: null }
  },
  renderLayers({ interactionState }) {
    return (
      <Source id="grades-hydrodl-source" type="vector" url={`pmtiles://${GRADES_HYDRODL_PMTILES_URL}`}>
        <Layer
          id="grades-hydrodl-line"
          type="line"
          source-layer={MERIT_BASINS_SOURCE_LAYER}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
          paint={{
            'line-color': GRADES_HYDRODL_LINE_COLOR,
            'line-opacity': 0.9,
            'line-width': GRADES_HYDRODL_LINE_WIDTH,
          }}
        />
        <Layer
          id="grades-hydrodl-line-highlight"
          type="line"
          source-layer={MERIT_BASINS_SOURCE_LAYER}
          filter={['==', ['get', 'COMID'], interactionState.hoveredGradesHydroDl?.comid ?? '__none__']}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
          paint={{
            'line-color': '#c62828',
            'line-opacity': 0.95,
            'line-width': GRADES_HYDRODL_LINE_WIDTH,
          }}
        />
      </Source>
    )
  },
  renderPopups({ interactionState }) {
    const hoveredGradesHydroDl = interactionState.hoveredGradesHydroDl

    if (!hoveredGradesHydroDl) {
      return null
    }

    return (
      <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredGradesHydroDl.latitude}
        longitude={hoveredGradesHydroDl.longitude}
        offset={10}
      >
        <div className="river-popup">
          <strong>COMID: {hoveredGradesHydroDl.comid}</strong>
          <p>Length: {hoveredGradesHydroDl.lengthKm} km</p>
          <p>Start-to-end Distance: {hoveredGradesHydroDl.lengthDirKm} km</p>
          <p>Sinuosity: {hoveredGradesHydroDl.sinuosity}</p>
          <p>Slope: {hoveredGradesHydroDl.slopePermil}&permil;</p>
          <p>
            Upstream Area: {hoveredGradesHydroDl.upstreamArea} km<sup>2</sup>
          </p>
          <p>Stream Order: {Number.isFinite(hoveredGradesHydroDl.order) ? hoveredGradesHydroDl.order : 'Unknown'}</p>
          <p>Downstream COMID: {hoveredGradesHydroDl.nextDownId}</p>
          {Number.isFinite(hoveredGradesHydroDl.order) && hoveredGradesHydroDl.order > 1 ? (
            <>
              <p>Upstream COMID 1: {hoveredGradesHydroDl.up1}</p>
              <p>Upstream COMID 2: {hoveredGradesHydroDl.up2}</p>
            </>
          ) : null}
          {Number.isFinite(hoveredGradesHydroDl.maxup) && hoveredGradesHydroDl.maxup > 2 ? (
            <p>Upstream COMID 3: {hoveredGradesHydroDl.up3}</p>
          ) : null}
          {Number.isFinite(hoveredGradesHydroDl.maxup) && hoveredGradesHydroDl.maxup > 3 ? (
            <p>Upstream COMID 4: {hoveredGradesHydroDl.up4}</p>
          ) : null}
        </div>
      </Popup>
    )
  },
}

export default gradesHydroDlLayer

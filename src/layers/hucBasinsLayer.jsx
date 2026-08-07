import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import { HUC_BASINS_PMTILES_URL, HUC_BASINS_SOURCE_LAYER } from '../config/mapConfig'

const HUC_FIELDS = ['huc12', 'huc10', 'huc8', 'huc6', 'huc4', 'huc2']
const HUC_ID_EXPRESSION = [
  'coalesce',
  ...HUC_FIELDS.map((field) => ['get', field]),
  '__none__',
]

function findHucId(properties) {
  for (const field of HUC_FIELDS) {
    const value = properties[field]
    if (value != null && String(value).trim()) return String(value)
  }
  return 'Unknown'
}

function formatAreaSqKm(value) {
  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : 'Unknown'
}

function buildHoveredHucBasin(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    hucId: findHucId(properties),
    name: properties.name || 'Unnamed',
    areaSqKm: formatAreaSqKm(properties.areasqkm),
  }
}

const hucBasinsLayer = {
  id: 'hucBasins',
  stateKey: 'hoveredHucBasin',
  isVisible: ({ appState }) => appState.layers.hucBasins,
  getInteractiveLayerIds() {
    return ['huc-basins-hit']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'huc-basins-hit')
    return {
      hoveredHucBasin: hoveredFeature ? buildHoveredHucBasin(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredHucBasin: null }
  },
  renderLayers({ interactionState }) {
    return (
      <Source id="huc-basins-source" type="vector" url={`pmtiles://${HUC_BASINS_PMTILES_URL}`}>
        <Layer
          id="huc-basins-hit"
          type="fill"
          source-layer={HUC_BASINS_SOURCE_LAYER}
          paint={{
            'fill-color': '#4b5563',
            'fill-opacity': 0.01,
          }}
        />
        <Layer
          id="huc-basins-outline"
          type="line"
          source-layer={HUC_BASINS_SOURCE_LAYER}
          paint={{
            'line-color': '#4b5563',
            'line-opacity': 0.9,
            'line-width': 1.25,
          }}
        />
        <Layer
          id="huc-basins-highlight"
          type="fill"
          source-layer={HUC_BASINS_SOURCE_LAYER}
          filter={[
            '==',
            HUC_ID_EXPRESSION,
            interactionState.hoveredHucBasin?.hucId ?? '__none__',
          ]}
          paint={{
            'fill-color': '#4b5563',
            'fill-opacity': 0.2,
          }}
        />
        <Layer
          id="huc-basins-highlight-outline"
          type="line"
          source-layer={HUC_BASINS_SOURCE_LAYER}
          filter={[
            '==',
            HUC_ID_EXPRESSION,
            interactionState.hoveredHucBasin?.hucId ?? '__none__',
          ]}
          paint={{
            'line-color': '#374151',
            'line-opacity': 1,
            'line-width': 3.5,
          }}
        />
      </Source>
    )
  },
  renderPopups({ interactionState }) {
    const hoveredHucBasin = interactionState.hoveredHucBasin
    if (!hoveredHucBasin) return null

    return (
      <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredHucBasin.latitude}
        longitude={hoveredHucBasin.longitude}
        offset={10}
      >
        <div className="river-popup">
          <strong>HUC ID: {hoveredHucBasin.hucId}</strong>
          <p>Name: {hoveredHucBasin.name}</p>
          <p>
            Area: {hoveredHucBasin.areaSqKm} km<sup>2</sup>
          </p>
        </div>
      </Popup>
    )
  },
}

export default hucBasinsLayer

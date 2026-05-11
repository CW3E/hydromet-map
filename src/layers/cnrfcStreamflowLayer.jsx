import { useEffect, useRef } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import { createSelectedCnrfcStreamflowPopupState } from '../features/cnrfcStreamflowPopup/cnrfcStreamflowPopupData'
import {
  CNRFC_STREAMFLOW_DATA_SOURCE_LAYER,
  RIVER_NETWORK_PMTILES_URL,
  RIVER_NETWORK_SOURCE_LAYER,
} from '../config/mapConfig'
import { applyBookmarkedPopupTab, findBookmarkFeatureAtPoint } from './bookmarkRestore'

const STREAMFLOW_LINE_WIDTH = [
  'interpolate',
  ['linear'],
  ['zoom'],
  0,
  ['-', ['get', 'stream_order'], 6],
  1,
  ['-', ['get', 'stream_order'], 6],
  2,
  ['-', ['get', 'stream_order'], 6],
  3,
  ['-', ['get', 'stream_order'], 5.5],
  4,
  ['-', ['get', 'stream_order'], 5],
  5,
  ['-', ['get', 'stream_order'], 5],
  6,
  ['-', ['get', 'stream_order'], 4],
  7,
  ['-', ['get', 'stream_order'], 3],
  8,
  ['-', ['get', 'stream_order'], 2],
  9,
  ['-', ['get', 'stream_order'], 1],
  10,
  ['-', ['get', 'stream_order'], 1],
  11,
  ['-', ['get', 'stream_order'], 1],
  12,
  ['+', ['get', 'stream_order'], 0],
  13,
  ['+', ['get', 'stream_order'], 1],
]

const STREAMFLOW_CASING_LINE_WIDTH = [
  'interpolate',
  ['linear'],
  ['zoom'],
  0,
  ['-', ['get', 'stream_order'], 5],
  1,
  ['-', ['get', 'stream_order'], 5],
  2,
  ['-', ['get', 'stream_order'], 5],
  3,
  ['-', ['get', 'stream_order'], 4.5],
  4,
  ['-', ['get', 'stream_order'], 4],
  5,
  ['-', ['get', 'stream_order'], 4],
  6,
  ['-', ['get', 'stream_order'], 3],
  7,
  ['-', ['get', 'stream_order'], 2],
  8,
  ['-', ['get', 'stream_order'], 1],
  9,
  ['-', ['get', 'stream_order'], 0],
  10,
  ['-', ['get', 'stream_order'], 0],
  11,
  ['-', ['get', 'stream_order'], 0],
  12,
  ['+', ['get', 'stream_order'], 1],
  13,
  ['+', ['get', 'stream_order'], 2],
]

const STREAMFLOW_COLOR = [
  'step',
  ['coalesce', ['feature-state', 'streamflow_r'], -1],
  'gray',
  0,
  'sienna',
  5,
  'goldenrod',
  10,
  'olive',
  20,
  'darkgreen',
  50,
  'darkcyan',
  80,
  'darkblue',
  90,
  'darkmagenta',
  95,
  'magenta',
]

function formatNumber(value, digits = 1) {
  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : null
}

function getFeatureId(feature) {
  return feature?.id ?? feature?.properties?.feature_id ?? null
}

function buildHoveredStreamflow(event, feature) {
  const properties = feature?.properties ?? {}
  const rawLength = Number.parseFloat(properties.Shape_Length)
  const hasValidLength = Number.isFinite(rawLength)
  const streamflowRank = Number.parseFloat(feature?.state?.streamflow_r)
  const streamflowValue = Number.parseFloat(feature?.state?.streamflow)

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    featureId: properties.feature_id ?? 'Unknown',
    name: properties.gnis_name || 'Unnamed',
    source: properties.source || 'Unknown',
    lengthKm: hasValidLength ? (rawLength * 111.1).toFixed(1) : null,
    streamOrder: properties.stream_order ?? 'Unknown',
    streamflowRank: Number.isFinite(streamflowRank) ? streamflowRank : null,
    streamflowValue: Number.isFinite(streamflowValue) ? streamflowValue : null,
  }
}

function CnrfcStreamflowLayers({ appState, interactionState, layerFamily, mapInstance }) {
  const appliedFeatureIdsRef = useRef(new Set())
  const dataPmtilesUrl =
    layerFamily?.linkedLayers?.cnrfcStreamflow?.buildDataPmtilesUrl?.(appState.family) ?? null

  useEffect(() => {
    if (!mapInstance || !dataPmtilesUrl) {
      return undefined
    }

    function syncStreamflowFeatureState() {
      const geometrySource = mapInstance.getSource('cnrfc-streamflow-geometry-source')
      const dataSource = mapInstance.getSource('cnrfc-streamflow-data-source')

      if (!geometrySource || !dataSource) {
        return
      }

      const dataFeatures = mapInstance.querySourceFeatures('cnrfc-streamflow-data-source', {
        sourceLayer: CNRFC_STREAMFLOW_DATA_SOURCE_LAYER,
      })

      const nextStreamflowById = new Map()

      dataFeatures.forEach((feature) => {
        const featureId = getFeatureId(feature)
        const streamflowRank = Number.parseFloat(feature?.properties?.streamflow_r)
        const streamflowValue = Number.parseFloat(feature?.properties?.streamflow)

        if (featureId == null || !Number.isFinite(streamflowRank) || nextStreamflowById.has(featureId)) {
          return
        }

        nextStreamflowById.set(featureId, {
          streamflow_r: streamflowRank,
          streamflow: Number.isFinite(streamflowValue) ? streamflowValue : null,
        })
      })

      appliedFeatureIdsRef.current.forEach((featureId) => {
        if (!nextStreamflowById.has(featureId)) {
          mapInstance.removeFeatureState({
            source: 'cnrfc-streamflow-geometry-source',
            sourceLayer: RIVER_NETWORK_SOURCE_LAYER,
            id: featureId,
          })
        }
      })

      nextStreamflowById.forEach((streamflowState, featureId) => {
        mapInstance.setFeatureState(
          {
            source: 'cnrfc-streamflow-geometry-source',
            sourceLayer: RIVER_NETWORK_SOURCE_LAYER,
            id: featureId,
          },
          streamflowState,
        )
      })

      appliedFeatureIdsRef.current = new Set(nextStreamflowById.keys())
    }

    function handleMapIdle() {
      syncStreamflowFeatureState()
    }

    syncStreamflowFeatureState()
    mapInstance.on('idle', handleMapIdle)

    return () => {
      mapInstance.off('idle', handleMapIdle)
      if (mapInstance.getSource('cnrfc-streamflow-geometry-source')) {
        appliedFeatureIdsRef.current.forEach((featureId) => {
          mapInstance.removeFeatureState({
            source: 'cnrfc-streamflow-geometry-source',
            sourceLayer: RIVER_NETWORK_SOURCE_LAYER,
            id: featureId,
          })
        })
      }
      appliedFeatureIdsRef.current = new Set()
    }
  }, [dataPmtilesUrl, mapInstance])

  return (
    <>
      {dataPmtilesUrl ? (
        <Source
          id="cnrfc-streamflow-data-source"
          type="vector"
          url={`pmtiles://${dataPmtilesUrl}`}
          promoteId={{ [CNRFC_STREAMFLOW_DATA_SOURCE_LAYER]: 'feature_id' }}
        >
          <Layer
            id="cnrfc-streamflow-data-hidden"
            type="circle"
            source-layer={CNRFC_STREAMFLOW_DATA_SOURCE_LAYER}
            paint={{
              'circle-radius': 0.1,
              'circle-opacity': 0,
              'circle-stroke-opacity': 0,
            }}
          />
        </Source>
      ) : null}
      <Source
        id="cnrfc-streamflow-geometry-source"
        type="vector"
        url={`pmtiles://${RIVER_NETWORK_PMTILES_URL}`}
        promoteId={{ [RIVER_NETWORK_SOURCE_LAYER]: 'feature_id' }}
      >
        <Layer
          id="cnrfc-streamflow-line-casing"
          type="line"
          source-layer={RIVER_NETWORK_SOURCE_LAYER}
          paint={{
            'line-color': '#ffffff',
            'line-opacity': 1,
            'line-width': STREAMFLOW_CASING_LINE_WIDTH,
          }}
        />
        <Layer
          id="cnrfc-streamflow-line"
          type="line"
          source-layer={RIVER_NETWORK_SOURCE_LAYER}
          paint={{
            'line-color': STREAMFLOW_COLOR,
            'line-opacity': 0.92,
            'line-width': STREAMFLOW_LINE_WIDTH,
          }}
        />
        <Layer
          id="cnrfc-streamflow-line-highlight"
          type="line"
          source-layer={RIVER_NETWORK_SOURCE_LAYER}
          filter={['==', ['get', 'feature_id'], interactionState.hoveredCnrfcStreamflow?.featureId ?? '__none__']}
          paint={{
            'line-color': '#c62828',
            'line-opacity': 0.95,
            'line-width': STREAMFLOW_LINE_WIDTH,
          }}
        />
      </Source>
    </>
  )
}

const cnrfcStreamflowLayer = {
  id: 'cnrfcStreamflow',
  stateKey: 'hoveredCnrfcStreamflow',
  isVisible: ({ appState }) => appState.layers.cnrfcStreamflow,
  getInteractiveLayerIds() {
    return ['cnrfc-streamflow-line']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'cnrfc-streamflow-line')

    return {
      hoveredCnrfcStreamflow: hoveredFeature ? buildHoveredStreamflow(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredCnrfcStreamflow: null }
  },
  handleClick({ event, setSelectedStation }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'cnrfc-streamflow-line')

    if (!clickedFeature || clickedFeature.geometry.type !== 'LineString') {
      return false
    }

    setSelectedStation(
      createSelectedCnrfcStreamflowPopupState(clickedFeature, {
        layerId: 'cnrfcStreamflow',
        popupOwnerId: 'cnrfcStreamflow',
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      }),
    )

    return true
  },
  restorePopupFromBookmark({ bookmarkPopup, mapInstance, setSelectedStation }) {
    const feature = findBookmarkFeatureAtPoint({
      bookmarkPopup,
      getFeatureId: (item) => item.properties?.feature_id,
      layerIds: ['cnrfc-streamflow-line'],
      mapInstance,
    })

    if (!feature || feature.geometry.type !== 'LineString') {
      return false
    }

    setSelectedStation(
      applyBookmarkedPopupTab(
        createSelectedCnrfcStreamflowPopupState(feature, {
          layerId: 'cnrfcStreamflow',
          popupOwnerId: 'cnrfcStreamflow',
          longitude: bookmarkPopup.longitude,
          latitude: bookmarkPopup.latitude,
        }),
        bookmarkPopup,
      ),
    )

    return true
  },
  renderLayers(props) {
    return <CnrfcStreamflowLayers {...props} />
  },
  renderPopups({ interactionState }) {
    const hoveredStreamflow = interactionState.hoveredCnrfcStreamflow

    if (!hoveredStreamflow) {
      return null
    }

    return (
      <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredStreamflow.latitude}
        longitude={hoveredStreamflow.longitude}
        offset={10}
      >
        <div className="river-popup">
          <strong>River ID: {hoveredStreamflow.featureId}</strong>
          <p>Name: {hoveredStreamflow.name}</p>
          <p>Source: {hoveredStreamflow.source}</p>
          <p>
            Length: {hoveredStreamflow.lengthKm ?? 'Unknown'}{hoveredStreamflow.lengthKm ? ' km' : ''}
          </p>
          <p>Stream Order: {hoveredStreamflow.streamOrder}</p>
          <p>WRF-Hydro Estimated Natural Flow: (UNCORRECTED!)</p>
          <p style={{ paddingLeft: '0.4rem' }}>
            Rate: {formatNumber(hoveredStreamflow.streamflowValue, 1) ?? 'Unknown'}
            {hoveredStreamflow.streamflowValue != null ? (
              <>
                {' '}m<sup>3</sup>/s
              </>
            ) : ''}
          </p>
          <p style={{ paddingLeft: '0.4rem' }}>
            Percentile (31-day window): {formatNumber(hoveredStreamflow.streamflowRank, 1) ?? 'Unknown'}
            {hoveredStreamflow.streamflowRank != null ? '%' : ''}
          </p>
        </div>
      </Popup>
    )
  },
}

export default cnrfcStreamflowLayer

import { useEffect, useRef } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import { createSelectedGlobalReachPopupState } from '../features/globalReachPopup/globalReachPopupData'
import {
  GRADES_HYDRODL_PMTILES_URL,
  GRADES_HYDRODL_STREAMFLOW_SOURCE_LAYER,
  MERIT_BASINS_SOURCE_LAYER,
} from '../config/mapConfig'
import { applyBookmarkedPopupTab, findBookmarkFeatureAtPoint } from './bookmarkRestore'

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

const GRADES_HYDRODL_CASING_LINE_WIDTH = [
  'interpolate',
  ['linear'],
  ['zoom'],
  0,
  ['-', ['get', 'order'], 4],
  1,
  ['-', ['get', 'order'], 4],
  2,
  ['-', ['get', 'order'], 4],
  3,
  ['-', ['get', 'order'], 3.5],
  4,
  ['-', ['get', 'order'], 3],
  5,
  ['-', ['get', 'order'], 3],
  6,
  ['-', ['get', 'order'], 2],
  7,
  ['-', ['get', 'order'], 1],
  8,
  ['-', ['get', 'order'], 0],
  9,
  ['+', ['get', 'order'], 1],
  10,
  ['+', ['get', 'order'], 1],
  11,
  ['+', ['get', 'order'], 2],
  12,
  ['+', ['get', 'order'], 3],
]

const GRADES_HYDRODL_DYNAMIC_LINE_COLOR = [
  'match',
  ['coalesce', ['feature-state', 'pctl_range'], '__unknown__'],
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

function getFeatureId(feature) {
  return feature?.id ?? feature?.properties?.COMID ?? null
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

function GradesHydroDlDynamicLayers({ appState, interactionState, layerFamily, mapInstance }) {
  const appliedFeatureIdsRef = useRef(new Set())
  const dataPmtilesUrl =
    layerFamily?.linkedLayers?.gradesHydroDl?.buildDataPmtilesUrl?.(appState.family) ?? null

  useEffect(() => {
    if (!mapInstance || !dataPmtilesUrl) {
      return undefined
    }

    function syncGradesFeatureState() {
      const geometrySource = mapInstance.getSource('grades-hydrodl-dynamic-geometry-source')
      const dataSource = mapInstance.getSource('grades-hydrodl-dynamic-data-source')

      if (!geometrySource || !dataSource) {
        return
      }

      const dataFeatures = mapInstance.querySourceFeatures('grades-hydrodl-dynamic-data-source', {
        sourceLayer: GRADES_HYDRODL_STREAMFLOW_SOURCE_LAYER,
      })

      const nextPctlRangeById = new Map()

      dataFeatures.forEach((feature) => {
        const featureId = getFeatureId(feature)
        const pctlRange = Number.parseInt(feature?.properties?.pctl_range, 10)

        if (featureId == null || !Number.isFinite(pctlRange) || nextPctlRangeById.has(featureId)) {
          return
        }

        nextPctlRangeById.set(featureId, {
          pctl_range: pctlRange,
        })
      })

      appliedFeatureIdsRef.current.forEach((featureId) => {
        if (!nextPctlRangeById.has(featureId)) {
          mapInstance.removeFeatureState({
            source: 'grades-hydrodl-dynamic-geometry-source',
            sourceLayer: MERIT_BASINS_SOURCE_LAYER,
            id: featureId,
          })
        }
      })

      nextPctlRangeById.forEach((featureState, featureId) => {
        mapInstance.setFeatureState(
          {
            source: 'grades-hydrodl-dynamic-geometry-source',
            sourceLayer: MERIT_BASINS_SOURCE_LAYER,
            id: featureId,
          },
          featureState,
        )
      })

      appliedFeatureIdsRef.current = new Set(nextPctlRangeById.keys())
    }

    function handleMapIdle() {
      syncGradesFeatureState()
    }

    syncGradesFeatureState()
    mapInstance.on('idle', handleMapIdle)

    return () => {
      mapInstance.off('idle', handleMapIdle)
      appliedFeatureIdsRef.current.forEach((featureId) => {
        mapInstance.removeFeatureState({
          source: 'grades-hydrodl-geometry-source',
          sourceLayer: MERIT_BASINS_SOURCE_LAYER,
          id: featureId,
        })
      })
      appliedFeatureIdsRef.current = new Set()
    }
  }, [dataPmtilesUrl, mapInstance])

  return (
    <>
      {dataPmtilesUrl ? (
        <Source
          id="grades-hydrodl-dynamic-data-source"
          type="vector"
          url={`pmtiles://${dataPmtilesUrl}`}
          promoteId={{ [GRADES_HYDRODL_STREAMFLOW_SOURCE_LAYER]: 'COMID' }}
        >
          <Layer
            id="grades-hydrodl-dynamic-data-hidden"
            type="circle"
            source-layer={GRADES_HYDRODL_STREAMFLOW_SOURCE_LAYER}
            paint={{
              'circle-radius': 0.1,
              'circle-opacity': 0,
              'circle-stroke-opacity': 0,
            }}
          />
        </Source>
      ) : null}
      <Source
        id="grades-hydrodl-dynamic-geometry-source"
        type="vector"
        url={`pmtiles://${GRADES_HYDRODL_PMTILES_URL}`}
        promoteId={{ [MERIT_BASINS_SOURCE_LAYER]: 'COMID' }}
      >
        <Layer
          id="grades-hydrodl-dynamic-line-casing"
          type="line"
          source-layer={MERIT_BASINS_SOURCE_LAYER}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
          paint={{
            'line-color': '#ffffff',
            'line-opacity': 1,
            'line-width': GRADES_HYDRODL_CASING_LINE_WIDTH,
          }}
        />
        <Layer
          id="grades-hydrodl-dynamic-line"
          type="line"
          source-layer={MERIT_BASINS_SOURCE_LAYER}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
          paint={{
            'line-color': GRADES_HYDRODL_DYNAMIC_LINE_COLOR,
            'line-opacity': 0.9,
            'line-width': GRADES_HYDRODL_LINE_WIDTH,
          }}
        />
        <Layer
          id="grades-hydrodl-dynamic-line-highlight"
          type="line"
          source-layer={MERIT_BASINS_SOURCE_LAYER}
          filter={['==', ['get', 'COMID'], interactionState.hoveredGradesHydroDlDynamic?.comid ?? '__none__']}
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
    </>
  )
}

const gradesHydroDlLayer = {
  id: 'gradesHydroDl',
  stateKey: 'hoveredGradesHydroDlDynamic',
  isVisible: ({ appState }) => appState.layers.gradesHydroDl,
  getInteractiveLayerIds() {
    return ['grades-hydrodl-dynamic-line']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'grades-hydrodl-dynamic-line')

    return {
      hoveredGradesHydroDlDynamic: hoveredFeature ? buildHoveredGradesHydroDl(event, hoveredFeature) : null,
    }
  },
  getPointerLeaveState() {
    return { hoveredGradesHydroDlDynamic: null }
  },
  handleClick({ event, setSelectedStation }) {
    const clickedFeature = event.features?.find((feature) => feature.layer.id === 'grades-hydrodl-dynamic-line')

    if (!clickedFeature || clickedFeature.geometry.type !== 'LineString') {
      return false
    }

    setSelectedStation(
      createSelectedGlobalReachPopupState(clickedFeature, {
        layerId: 'gradesHydroDl',
        popupOwnerId: 'gradesHydroDl',
        hydrography: 'MERIT',
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      }),
    )

    return true
  },
  restorePopupFromBookmark({ bookmarkPopup, mapInstance, setSelectedStation }) {
    const feature = findBookmarkFeatureAtPoint({
      bookmarkPopup,
      getFeatureId: (item) => item.properties?.COMID ?? item.properties?.feature_id,
      layerIds: ['grades-hydrodl-dynamic-line'],
      mapInstance,
    })

    if (!feature || feature.geometry.type !== 'LineString') {
      return false
    }

    setSelectedStation(
      applyBookmarkedPopupTab(
        createSelectedGlobalReachPopupState(feature, {
          layerId: 'gradesHydroDl',
          popupOwnerId: 'gradesHydroDl',
          hydrography: 'MERIT',
          longitude: bookmarkPopup.longitude,
          latitude: bookmarkPopup.latitude,
        }),
        bookmarkPopup,
      ),
    )

    return true
  },
  renderLayers(props) {
    return <GradesHydroDlDynamicLayers {...props} />
  },
  renderPopups({ interactionState }) {
    const hoveredGradesHydroDl = interactionState.hoveredGradesHydroDlDynamic

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

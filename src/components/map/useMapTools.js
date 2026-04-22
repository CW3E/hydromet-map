import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCoordinate } from '../../lib/appState'

function toRadians(value) {
  return (value * Math.PI) / 180
}

function calculateGreatCircleDistanceKm(start, end) {
  const earthRadiusKm = 6371
  const latitudeDelta = toRadians(end.latitude - start.latitude)
  const longitudeDelta = toRadians(end.longitude - start.longitude)
  const startLatitude = toRadians(start.latitude)
  const endLatitude = toRadians(end.latitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  return earthRadiusKm * centralAngle
}

export default function useMapTools({ mapInstance, setSelectedStation }) {
  const [contextMenuState, setContextMenuState] = useState(null)
  const [identifiedWatershed, setIdentifiedWatershed] = useState(null)
  const [identifiedUpstreamRivers, setIdentifiedUpstreamRivers] = useState(null)
  const [identifiedFlowpath, setIdentifiedFlowpath] = useState(null)
  const [measurementStart, setMeasurementStart] = useState(null)
  const [measurementPreviewEnd, setMeasurementPreviewEnd] = useState(null)
  const [measurementResult, setMeasurementResult] = useState(null)
  const [watershedDialogState, setWatershedDialogState] = useState(null)
  const [upstreamRiversDialogState, setUpstreamRiversDialogState] = useState(null)
  const [flowpathDialogState, setFlowpathDialogState] = useState(null)
  const [combinedToolsDialogState, setCombinedToolsDialogState] = useState(null)
  const contextMenuRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const longPressStartRef = useRef(null)

  async function downloadGeoJsonFile({ fileNameRoot = 'feature', geojson, latitude, longitude }) {
    const filename = `${fileNameRoot}_${formatCoordinate(latitude)}_${formatCoordinate(longitude)}.geojson`
      .replaceAll(',', '')
      .replaceAll(' ', '')
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  }

  async function fetchShapeGeoJson({ shapeType, latitude, longitude }) {
    const url = `https://mghydro.com/app/${shapeType}_api?lat=${latitude}&lng=${longitude}&precision=low`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}.`)
    }

    return response.json()
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function closeContextMenu() {
    setContextMenuState(null)
  }

  function openContextMenu({ latitude, longitude, x, y }) {
    setContextMenuState({
      latitude,
      longitude,
      x,
      y,
    })
  }

  function clearAllTemporaryLayers() {
    setIdentifiedWatershed(null)
    setIdentifiedUpstreamRivers(null)
    setIdentifiedFlowpath(null)
    setMeasurementStart(null)
    setMeasurementPreviewEnd(null)
    setMeasurementResult(null)
    closeContextMenu()
  }

  function startMeasurementAtContextLocation() {
    if (!contextMenuState) {
      return
    }

    setMeasurementStart({
      latitude: contextMenuState.latitude,
      longitude: contextMenuState.longitude,
    })
    setMeasurementPreviewEnd({
      latitude: contextMenuState.latitude,
      longitude: contextMenuState.longitude,
    })
    setMeasurementResult(null)
    closeContextMenu()
  }

  async function identifyWatershedAtContextLocation() {
    if (!contextMenuState) {
      return
    }

    const { latitude, longitude } = contextMenuState

    closeContextMenu()
    setWatershedDialogState({
      status: 'loading',
      latitude,
      longitude,
    })

    try {
      const geojson = await fetchShapeGeoJson({
        shapeType: 'watershed',
        latitude,
        longitude,
      })

      setWatershedDialogState({
        status: 'ready',
        geojson,
        latitude,
        longitude,
      })
    } catch (error) {
      setWatershedDialogState({
        status: 'error',
        latitude,
        longitude,
        message: error instanceof Error ? error.message : 'Unable to identify watershed.',
      })
    }
  }

  async function identifyUpstreamRiversAtContextLocation() {
    if (!contextMenuState) {
      return
    }

    const { latitude, longitude } = contextMenuState

    closeContextMenu()
    setUpstreamRiversDialogState({
      status: 'loading',
      latitude,
      longitude,
    })

    try {
      const geojson = await fetchShapeGeoJson({
        shapeType: 'upstream_rivers',
        latitude,
        longitude,
      })

      setUpstreamRiversDialogState({
        status: 'ready',
        geojson,
        latitude,
        longitude,
      })
    } catch (error) {
      setUpstreamRiversDialogState({
        status: 'error',
        latitude,
        longitude,
        message: error instanceof Error ? error.message : 'Unable to identify upstream rivers.',
      })
    }
  }

  async function identifyFlowpathAtContextLocation() {
    if (!contextMenuState) {
      return
    }

    const { latitude, longitude } = contextMenuState

    closeContextMenu()
    setFlowpathDialogState({
      status: 'loading',
      latitude,
      longitude,
    })

    try {
      const geojson = await fetchShapeGeoJson({
        shapeType: 'flowpath',
        latitude,
        longitude,
      })

      setFlowpathDialogState({
        status: 'ready',
        geojson,
        latitude,
        longitude,
      })
    } catch (error) {
      setFlowpathDialogState({
        status: 'error',
        latitude,
        longitude,
        message: error instanceof Error ? error.message : 'Unable to identify downstream flowpath.',
      })
    }
  }

  async function identifyAllThreeAtContextLocation() {
    if (!contextMenuState) {
      return
    }

    const { latitude, longitude } = contextMenuState

    closeContextMenu()
    setCombinedToolsDialogState({
      status: 'loading',
      latitude,
      longitude,
    })

    const requestConfigs = [
      { key: 'watershed', label: 'Watershed', fileNameRoot: 'watershed', shapeType: 'watershed' },
      { key: 'upstreamRivers', label: 'Upstream rivers', fileNameRoot: 'upstream_rivers', shapeType: 'upstream_rivers' },
      { key: 'flowpath', label: 'Downstream flowpath', fileNameRoot: 'flowpath', shapeType: 'flowpath' },
    ]

    const results = await Promise.allSettled(
      requestConfigs.map((config) =>
        fetchShapeGeoJson({
          shapeType: config.shapeType,
          latitude,
          longitude,
        }),
      ),
    )

    const downloads = []
    const payloads = {}
    const errors = []

    results.forEach((result, index) => {
      const config = requestConfigs[index]

      if (result.status === 'fulfilled') {
        payloads[config.key] = {
          geojson: result.value,
          latitude,
          longitude,
        }
        downloads.push({
          id: config.key,
          label: config.label,
          fileNameRoot: config.fileNameRoot,
          geojson: result.value,
          latitude,
          longitude,
        })
      } else {
        errors.push(`${config.label}: ${result.reason instanceof Error ? result.reason.message : 'Request failed.'}`)
      }
    })

    if (downloads.length === 0) {
      setCombinedToolsDialogState({
        status: 'error',
        latitude,
        longitude,
        message: 'All three API calls failed.',
        errors,
      })
      return
    }

    setCombinedToolsDialogState({
      status: errors.length > 0 ? 'partial' : 'ready',
      latitude,
      longitude,
      downloads,
      payloads,
      errors,
    })
  }

  function handlePointerMove(lngLat) {
    if (measurementStart) {
      setMeasurementPreviewEnd({
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      })
    }
  }

  function handlePointerLeave() {
    if (measurementStart) {
      setMeasurementPreviewEnd(null)
    }
  }

  function handleMapClick(event) {
    if (measurementStart) {
      const endPoint = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      }
      const distanceKm = calculateGreatCircleDistanceKm(measurementStart, endPoint)

      setMeasurementResult({
        start: measurementStart,
        end: endPoint,
        distanceKm,
      })
      setMeasurementStart(null)
      setMeasurementPreviewEnd(null)
      closeContextMenu()
      setSelectedStation(null)
      return true
    }

    closeContextMenu()
    return false
  }

  function handleDragStart() {
    clearLongPressTimer()
    closeContextMenu()
  }

  function closeWatershedDialog() {
    setWatershedDialogState(null)
  }

  function closeUpstreamRiversDialog() {
    setUpstreamRiversDialogState(null)
  }

  function closeFlowpathDialog() {
    setFlowpathDialogState(null)
  }

  function closeCombinedToolsDialog() {
    setCombinedToolsDialogState(null)
  }

  const contextMenuActions = useMemo(() => {
    if (!contextMenuState) {
      return []
    }

    return [
      { id: 'identify-watershed', label: 'Watershed to here', onSelect: identifyWatershedAtContextLocation },
      { id: 'identify-upstream-rivers', label: 'Upstream rivers', onSelect: identifyUpstreamRiversAtContextLocation },
      { id: 'identify-flowpath', label: 'Downstream flowpath', onSelect: identifyFlowpathAtContextLocation },
      { id: 'identify-all-three', label: 'All 3 above!', onSelect: identifyAllThreeAtContextLocation },
      { id: 'measure-distance', label: 'Measure distance', onSelect: startMeasurementAtContextLocation },
      {
        id: 'clear-all-temporary',
        label: 'Clear all temporary',
        disabled: !identifiedWatershed && !identifiedUpstreamRivers && !identifiedFlowpath && !measurementStart && !measurementResult,
        onSelect: clearAllTemporaryLayers,
      },
    ]
  }, [contextMenuState, identifiedFlowpath, identifiedUpstreamRivers, identifiedWatershed, measurementResult, measurementStart])

  useEffect(() => {
    if (!mapInstance) {
      return undefined
    }

    const canvasContainer = mapInstance.getCanvasContainer()

    function getPointFromClientPosition(clientX, clientY) {
      const rect = canvasContainer.getBoundingClientRect()
      return {
        pointX: clientX - rect.left,
        pointY: clientY - rect.top,
      }
    }

    function handleContextMenu(event) {
      event.preventDefault()

      const { pointX, pointY } = getPointFromClientPosition(event.clientX, event.clientY)
      const lngLat = mapInstance.unproject([pointX, pointY])

      openContextMenu({
        latitude: lngLat.lat,
        longitude: lngLat.lng,
        x: pointX,
        y: pointY,
      })
    }

    function handleLongPressPointerDown(event) {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
        return
      }

      clearLongPressTimer()

      const { pointX, pointY } = getPointFromClientPosition(event.clientX, event.clientY)

      longPressStartRef.current = {
        pointX,
        pointY,
      }

      longPressTimerRef.current = window.setTimeout(() => {
        const lngLat = mapInstance.unproject([pointX, pointY])

        openContextMenu({
          latitude: lngLat.lat,
          longitude: lngLat.lng,
          x: pointX,
          y: pointY,
        })

        clearLongPressTimer()
      }, 600)
    }

    function handleLongPressPointerMove(event) {
      if (!longPressStartRef.current) {
        return
      }

      const { pointX, pointY } = getPointFromClientPosition(event.clientX, event.clientY)
      const dx = pointX - longPressStartRef.current.pointX
      const dy = pointY - longPressStartRef.current.pointY

      if (Math.hypot(dx, dy) > 8) {
        clearLongPressTimer()
        longPressStartRef.current = null
      }
    }

    function handleLongPressPointerEnd() {
      clearLongPressTimer()
      longPressStartRef.current = null
    }

    canvasContainer.addEventListener('contextmenu', handleContextMenu)
    canvasContainer.addEventListener('pointerdown', handleLongPressPointerDown)
    canvasContainer.addEventListener('pointermove', handleLongPressPointerMove)
    canvasContainer.addEventListener('pointerup', handleLongPressPointerEnd)
    canvasContainer.addEventListener('pointercancel', handleLongPressPointerEnd)
    canvasContainer.addEventListener('pointerleave', handleLongPressPointerEnd)

    return () => {
      clearLongPressTimer()
      longPressStartRef.current = null
      canvasContainer.removeEventListener('contextmenu', handleContextMenu)
      canvasContainer.removeEventListener('pointerdown', handleLongPressPointerDown)
      canvasContainer.removeEventListener('pointermove', handleLongPressPointerMove)
      canvasContainer.removeEventListener('pointerup', handleLongPressPointerEnd)
      canvasContainer.removeEventListener('pointercancel', handleLongPressPointerEnd)
      canvasContainer.removeEventListener('pointerleave', handleLongPressPointerEnd)
    }
  }, [mapInstance])

  useEffect(() => {
    if (!contextMenuState) {
      return undefined
    }

    function handleDocumentPointerDown(event) {
      if (contextMenuRef.current?.contains(event.target)) {
        return
      }

      closeContextMenu()
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
    }
  }, [contextMenuState])

  return {
    closeCombinedToolsDialog,
    closeContextMenu,
    closeFlowpathDialog,
    closeUpstreamRiversDialog,
    closeWatershedDialog,
    combinedToolsDialogState,
    contextMenuActions,
    contextMenuRef,
    contextMenuState,
    downloadGeoJsonFile,
    flowpathDialogState,
    handleDragStart,
    handleMapClick,
    handlePointerLeave,
    handlePointerMove,
    identifiedFlowpath,
    identifiedUpstreamRivers,
    identifiedWatershed,
    measurementPreviewDistanceKm:
      measurementStart && measurementPreviewEnd
        ? calculateGreatCircleDistanceKm(measurementStart, measurementPreviewEnd)
        : null,
    measurementPreviewEnd,
    measurementResult,
    measurementStart,
    setIdentifiedFlowpath,
    setIdentifiedUpstreamRivers,
    setIdentifiedWatershed,
    upstreamRiversDialogState,
    watershedDialogState,
  }
}

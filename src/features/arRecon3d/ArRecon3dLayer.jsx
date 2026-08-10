import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Popup } from 'react-map-gl/maplibre'
import * as THREE from 'three'
import { loadArReconCatalog, loadArReconFlight } from '../../lib/arReconData'
import {
  getArReconFlightColor,
  getArReconFlightDate,
  getArReconFlightLabel,
} from './arReconStyle'
import ArReconSondePopup from './ArReconSondePopup'

const AR_RECON_CUSTOM_LAYER_ID = 'ar-recon-three-layer'
const AR_RECON_POPUP_TYPE = 'ar-recon-sonde'
const SONDE_BOOKMARK_SEPARATOR = '::'

function getSondeBookmarkId(flightId, sondeId) {
  return `${flightId}${SONDE_BOOKMARK_SEPARATOR}${sondeId}`
}

function resolveBookmarkedSonde(selectedStation, flightsData) {
  if (selectedStation?.popupType !== AR_RECON_POPUP_TYPE || selectedStation.sonde) return null
  const separatorIndex = selectedStation.id?.lastIndexOf(SONDE_BOOKMARK_SEPARATOR) ?? -1
  if (separatorIndex < 0) return null
  const flightId = selectedStation.id.slice(0, separatorIndex)
  const sondeId = selectedStation.id.slice(separatorIndex + SONDE_BOOKMARK_SEPARATOR.length)
  const flightData = flightsData.find((item) => item.flight.id === flightId)
  const sonde = flightData?.sondes.find((item) => String(item.id) === sondeId)
  const launchPosition = getSondeLaunchPosition(sonde)
  if (!flightData || !sonde || !launchPosition) return null
  return {
    ...selectedStation,
    flight: flightData.flight,
    sonde,
    ...launchPosition,
  }
}

function createSelectedSondeState(selection, activeTabId = 'temperature') {
  return {
    ...selection,
    id: getSondeBookmarkId(selection.flight.id, selection.sonde.id),
    layerId: 'arRecon3d',
    popupOwnerId: 'arRecon3d',
    popupType: AR_RECON_POPUP_TYPE,
    popup: { activeTabId },
  }
}

function addTrajectoryLines(
  group,
  payload,
  originCoordinate,
  material,
  verticalExaggeration,
  sondeSelection = null,
) {
  const coordinates = payload?.coordinates ?? {}
  const longitudes = coordinates.longitude ?? []
  const latitudes = coordinates.latitude ?? []
  const altitudes = coordinates.altitudeMslMeters ?? []
  const segments = payload?.segments?.length ? payload.segments : [[0, longitudes.length]]

  segments.forEach(([start, end]) => {
    if (end - start < 2) return
    const positions = new Float32Array((end - start) * 3)

    for (let index = start; index < end; index += 1) {
      const coordinate = maplibregl.MercatorCoordinate.fromLngLat(
        [longitudes[index], latitudes[index]],
        altitudes[index],
      )
      const target = (index - start) * 3
      positions[target] = coordinate.x - originCoordinate.x
      positions[target + 1] = coordinate.y - originCoordinate.y
      positions[target + 2] = (coordinate.z - originCoordinate.z) * verticalExaggeration
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const line = new THREE.Line(geometry, material)
    if (sondeSelection) {
      const key = `${sondeSelection.flight.id}|${sondeSelection.sonde.id}`
      line.userData.sondeSelection = sondeSelection
      const highlight = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: 0xffffff,
          size: 4,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.9,
          depthTest: true,
        }),
      )
      highlight.visible = false
      highlight.userData.sondeHighlightKey = key
      group.add(highlight)
    }
    group.add(line)
  })
}

function addLaunchMarkers(group, sondes, originCoordinate, color, verticalExaggeration) {
  const positions = []
  sondes.forEach((sonde) => {
    const coordinates = sonde?.coordinates ?? {}
    const altitudes = coordinates.altitudeMslMeters ?? []
    if (!altitudes.length) return
    let launchIndex = 0
    for (let index = 1; index < altitudes.length; index += 1) {
      if (altitudes[index] > altitudes[launchIndex]) launchIndex = index
    }
    const coordinate = maplibregl.MercatorCoordinate.fromLngLat(
      [coordinates.longitude[launchIndex], coordinates.latitude[launchIndex]],
      altitudes[launchIndex],
    )
    positions.push(
      coordinate.x - originCoordinate.x,
      coordinate.y - originCoordinate.y,
      (coordinate.z - originCoordinate.z) * verticalExaggeration,
    )
  })

  if (!positions.length) return
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color,
    size: 5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.95,
  })
  group.add(new THREE.Points(geometry, material))
}

function getCombinedBounds(flightsData) {
  const longitude = [Infinity, -Infinity]
  const latitude = [Infinity, -Infinity]
  flightsData.forEach(({ manifest }) => {
    const flightLongitude = manifest.bounds?.longitude
    const flightLatitude = manifest.bounds?.latitude
    if (!flightLongitude || !flightLatitude) return
    longitude[0] = Math.min(longitude[0], flightLongitude[0])
    longitude[1] = Math.max(longitude[1], flightLongitude[1])
    latitude[0] = Math.min(latitude[0], flightLatitude[0])
    latitude[1] = Math.max(latitude[1], flightLatitude[1])
  })
  return Number.isFinite(longitude[0]) ? { longitude, latitude } : null
}

function getFlightLabelPosition(flightData) {
  const coordinates = flightData.aircraft?.coordinates ?? {}
  const longitudes = coordinates.longitude ?? []
  const latitudes = coordinates.latitude ?? []
  if (longitudes.length && latitudes.length) {
    const index = Math.floor(Math.min(longitudes.length, latitudes.length) / 2)
    return [longitudes[index], latitudes[index]]
  }
  const bounds = flightData.manifest.bounds
  return [
    (bounds.longitude[0] + bounds.longitude[1]) / 2,
    (bounds.latitude[0] + bounds.latitude[1]) / 2,
  ]
}

function createArReconScene(flightsData, verticalExaggeration) {
  const bounds = getCombinedBounds(flightsData)
  const center = [
    (bounds.longitude[0] + bounds.longitude[1]) / 2,
    (bounds.latitude[0] + bounds.latitude[1]) / 2,
  ]
  const originCoordinate = maplibregl.MercatorCoordinate.fromLngLat(center, 0)
  const scene = new THREE.Scene()
  const flightGroups = []

  flightsData.forEach((flightData) => {
    const color = getArReconFlightColor(flightData.flight.id)
    const aircraftGroup = new THREE.Group()
    const sondeGroup = new THREE.Group()
    const aircraftMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.98,
      depthTest: true,
    })
    addTrajectoryLines(
      aircraftGroup,
      flightData.aircraft,
      originCoordinate,
      aircraftMaterial,
      verticalExaggeration,
    )
    flightData.sondes.forEach((sonde) => {
      const sondeMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.58,
        depthTest: true,
      })
      const launchPosition = getSondeLaunchPosition(sonde)
      const sondeSelection = launchPosition ? {
        flight: flightData.flight,
        sonde,
        ...launchPosition,
      } : null
      addTrajectoryLines(
        sondeGroup,
        sonde,
        originCoordinate,
        sondeMaterial,
        verticalExaggeration,
        sondeSelection,
      )
    })
    addLaunchMarkers(
      sondeGroup,
      flightData.sondes,
      originCoordinate,
      color,
      verticalExaggeration,
    )
    scene.add(aircraftGroup, sondeGroup)
    flightGroups.push({ aircraftGroup, sondeGroup })
  })

  return { scene, originCoordinate, flightGroups, bounds }
}

function disposeScene(scene) {
  const geometries = new Set()
  const materials = new Set()
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => materials.add(material))
    } else if (object.material) {
      materials.add(object.material)
    }
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

function distanceSquaredToSegment(point, start, end) {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const lengthSquared = (deltaX * deltaX) + (deltaY * deltaY)
  if (!lengthSquared) return ((point.x - start.x) ** 2) + ((point.y - start.y) ** 2)
  const fraction = Math.max(0, Math.min(1, (
    ((point.x - start.x) * deltaX) + ((point.y - start.y) * deltaY)
  ) / lengthSquared))
  const nearestX = start.x + (fraction * deltaX)
  const nearestY = start.y + (fraction * deltaY)
  return ((point.x - nearestX) ** 2) + ((point.y - nearestY) ** 2)
}

function projectLinePoint(attribute, index, matrix, width, height, target) {
  target.fromBufferAttribute(attribute, index).applyMatrix4(matrix)
  target.x = ((target.x + 1) / 2) * width
  target.y = ((1 - target.y) / 2) * height
  return target
}

function createCustomLayer(map, flightsData, verticalExaggeration) {
  const { scene, originCoordinate, flightGroups, bounds } = createArReconScene(
    flightsData,
    verticalExaggeration,
  )
  const camera = new THREE.Camera()
  const projectedStart = new THREE.Vector3()
  const projectedEnd = new THREE.Vector3()
  const sondeLines = []
  const sondeHighlights = []
  scene.traverse((object) => {
    if (object.isLine && object.userData.sondeSelection) sondeLines.push(object)
    if (object.isPoints && object.userData.sondeHighlightKey) sondeHighlights.push(object)
  })
  let renderer = null
  let areSondesVisible = true
  let hoveredSondeKey = null
  const originTranslation = new THREE.Matrix4().makeTranslation(
    originCoordinate.x,
    originCoordinate.y,
    originCoordinate.z,
  )

  return {
    id: AR_RECON_CUSTOM_LAYER_ID,
    type: 'custom',
    renderingMode: '3d',
    bounds,
    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      })
      renderer.autoClear = false
    },
    setGroupVisibility({ aircraftVisible, sondesVisible }) {
      areSondesVisible = Boolean(sondesVisible)
      flightGroups.forEach((group) => {
        group.aircraftGroup.visible = aircraftVisible
        group.sondeGroup.visible = sondesVisible
      })
      map.triggerRepaint()
    },
    hitTest(point) {
      if (!areSondesVisible || !renderer) return null
      const canvas = map.getCanvas()
      const hitRadiusSquared = 8 ** 2
      let closestDistanceSquared = hitRadiusSquared
      let closestSelection = null

      sondeLines.forEach((line) => {
        const positions = line.geometry.getAttribute('position')
        if (!positions || positions.count < 2) return
        projectLinePoint(
          positions,
          0,
          camera.projectionMatrix,
          canvas.clientWidth,
          canvas.clientHeight,
          projectedStart,
        )
        for (let index = 1; index < positions.count; index += 1) {
          projectLinePoint(
            positions,
            index,
            camera.projectionMatrix,
            canvas.clientWidth,
            canvas.clientHeight,
            projectedEnd,
          )
          const distanceSquared = distanceSquaredToSegment(point, projectedStart, projectedEnd)
          if (distanceSquared <= closestDistanceSquared) {
            closestDistanceSquared = distanceSquared
            closestSelection = line.userData.sondeSelection
          }
          projectedStart.copy(projectedEnd)
        }
      })

      return closestSelection
    },
    setHoveredSonde(selection) {
      const nextKey = selection ? `${selection.flight.id}|${selection.sonde.id}` : null
      if (nextKey === hoveredSondeKey) return
      hoveredSondeKey = nextKey
      sondeLines.forEach((line) => {
        const item = line.userData.sondeSelection
        const isHovered = `${item.flight.id}|${item.sonde.id}` === hoveredSondeKey
        line.material.color.set(isHovered ? '#ffffff' : getArReconFlightColor(item.flight.id))
        line.material.opacity = isHovered ? 1 : 0.58
        line.material.linewidth = isHovered ? 4 : 1
      })
      sondeHighlights.forEach((highlight) => {
        highlight.visible = highlight.userData.sondeHighlightKey === hoveredSondeKey
      })
      map.triggerRepaint()
    },
    render(_gl, options) {
      if (!renderer) return
      camera.projectionMatrix
        .fromArray(options.defaultProjectionData.mainMatrix)
        .multiply(originTranslation)
      renderer.resetState()
      renderer.render(scene, camera)
    },
    onRemove() {
      disposeScene(scene)
      renderer?.dispose()
      renderer = null
    },
  }
}

function fitFlightBounds(map, bounds, duration = 700) {
  if (!bounds) return
  map.fitBounds(
    [
      [bounds.longitude[0], bounds.latitude[0]],
      [bounds.longitude[1], bounds.latitude[1]],
    ],
    { padding: 60, duration, maxZoom: 5 },
  )
}

function createFlightLabelMarker(map, flightData) {
  const element = document.createElement('div')
  const title = document.createElement('span')
  const date = document.createElement('span')
  const flightDate = getArReconFlightDate(flightData.flight, flightData.manifest)
  element.className = 'ar-recon-flight-label'
  element.style.setProperty('--flight-color', getArReconFlightColor(flightData.flight.id))
  title.className = 'ar-recon-flight-label__title'
  title.textContent = getArReconFlightLabel(flightData.flight)
  date.className = 'ar-recon-flight-label__date'
  date.textContent = flightDate
  element.append(title)
  if (flightDate) element.append(date)
  element.title = flightData.flight.originTime
    ? `Flight start: ${flightData.flight.originTime}`
    : `${title.textContent}${flightDate ? ` — ${flightDate}` : ''}`
  return new maplibregl.Marker({ element, anchor: 'center' })
    .setLngLat(getFlightLabelPosition(flightData))
    .addTo(map)
}

function getSondeLaunchPosition(sonde) {
  const coordinates = sonde?.coordinates ?? {}
  const altitudes = coordinates.altitudeMslMeters ?? []
  if (!altitudes.length) return null
  let launchIndex = 0
  for (let index = 1; index < altitudes.length; index += 1) {
    if (altitudes[index] > altitudes[launchIndex]) launchIndex = index
  }
  return {
    longitude: coordinates.longitude[launchIndex],
    latitude: coordinates.latitude[launchIndex],
  }
}

export default function ArRecon3dLayer({
  appState,
  mapInstance,
  selectedStation,
  setSelectedStation,
}) {
  const customLayerRef = useRef(null)
  const labelMarkersRef = useRef([])
  const firstFlightLoadRef = useRef(true)
  const [loadedFlightsData, setLoadedFlightsData] = useState([])
  const [hoveredSonde, setHoveredSonde] = useState(null)
  const familyState = appState.family
  const visibilityRef = useRef({ aircraftVisible: true, sondesVisible: true })
  const selectedFlightIds = Array.isArray(familyState?.selectedFlights)
    ? familyState.selectedFlights
    : (familyState?.flight ? [familyState.flight] : [])
  const selectedFlightsKey = selectedFlightIds.join(',')

  useEffect(() => {
    const resolvedSonde = resolveBookmarkedSonde(selectedStation, loadedFlightsData)
    if (resolvedSonde) setSelectedStation(resolvedSonde)
  }, [loadedFlightsData, selectedStation, setSelectedStation])

  useEffect(() => {
    const visibility = {
      aircraftVisible: familyState?.aircraftVisible ?? true,
      sondesVisible: familyState?.sondesVisible ?? true,
    }
    visibilityRef.current = visibility
    customLayerRef.current?.setGroupVisibility(visibility)
  }, [familyState?.aircraftVisible, familyState?.sondesVisible])

  useEffect(() => {
    if (!familyState?.fitRequest) return
    fitFlightBounds(mapInstance, customLayerRef.current?.bounds)
  }, [familyState?.fitRequest, mapInstance])

  useEffect(() => {
    if (!mapInstance || appState.projection !== 'mercator' || !selectedFlightsKey) {
      return undefined
    }

    let disposed = false
    let styleDataHandler = null
    let pointerHandlers = null

    function removePointerHandlers() {
      if (!pointerHandlers) return
      mapInstance.off('mousemove', pointerHandlers.move)
      mapInstance.off('click', pointerHandlers.click)
      mapInstance.off('mouseout', pointerHandlers.leave)
      pointerHandlers = null
    }

    async function loadAndAddLayer() {
      try {
        const catalog = await loadArReconCatalog()
        const selectedIdSet = new Set(selectedFlightsKey.split(',').filter(Boolean))
        const selectedFlights = catalog.flights.filter((flight) => selectedIdSet.has(flight.id))
        const results = await Promise.allSettled(
          selectedFlights.map((flight) => loadArReconFlight(flight)),
        )
        const flightsData = results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value)
        if (disposed || !flightsData.length) return
        setLoadedFlightsData(flightsData)

        const addLayer = () => {
          if (disposed || !mapInstance.isStyleLoaded() || mapInstance.getLayer(AR_RECON_CUSTOM_LAYER_ID)) {
            return
          }
          const layer = createCustomLayer(
            mapInstance,
            flightsData,
            Number.parseFloat(familyState.verticalExaggeration) || 1,
          )
          layer.setGroupVisibility(visibilityRef.current)
          customLayerRef.current = layer
          mapInstance.addLayer(layer)
          labelMarkersRef.current.forEach((marker) => marker.remove())
          labelMarkersRef.current = flightsData.map((flightData) =>
            createFlightLabelMarker(mapInstance, flightData),
          )
          removePointerHandlers()
          pointerHandlers = {
            move(event) {
              const hit = layer.hitTest(event.point)
              layer.setHoveredSonde(hit)
              setHoveredSonde(hit)
              mapInstance.getCanvas().style.cursor = hit ? 'pointer' : ''
            },
            click(event) {
              const hit = layer.hitTest(event.point)
              setSelectedStation(hit ? createSelectedSondeState(hit) : null)
            },
            leave() {
              layer.setHoveredSonde(null)
              setHoveredSonde(null)
              mapInstance.getCanvas().style.cursor = ''
            },
          }
          mapInstance.on('mousemove', pointerHandlers.move)
          mapInstance.on('click', pointerHandlers.click)
          mapInstance.on('mouseout', pointerHandlers.leave)

          if (firstFlightLoadRef.current) {
            const hasBookmarkedView = new URLSearchParams(window.location.search).has('c')
            firstFlightLoadRef.current = false
            if (!hasBookmarkedView) fitFlightBounds(mapInstance, layer.bounds, 900)
          }
        }

        addLayer()
        styleDataHandler = addLayer
        mapInstance.on('styledata', addLayer)
      } catch (error) {
        console.warn('Could not load AR Recon 3D flights', error)
      }
    }

    loadAndAddLayer()

    return () => {
      disposed = true
      if (styleDataHandler) mapInstance.off('styledata', styleDataHandler)
      removePointerHandlers()
      mapInstance.getCanvas().style.cursor = ''
      labelMarkersRef.current.forEach((marker) => marker.remove())
      labelMarkersRef.current = []
      if (mapInstance.getLayer(AR_RECON_CUSTOM_LAYER_ID)) {
        mapInstance.removeLayer(AR_RECON_CUSTOM_LAYER_ID)
      }
      customLayerRef.current = null
      setLoadedFlightsData([])
    }
  }, [
    appState.basemapId,
    appState.projection,
    familyState?.verticalExaggeration,
    mapInstance,
    selectedFlightsKey,
    setSelectedStation,
  ])

  const selectedFlightIdSet = new Set(selectedFlightIds)
  const selectedSonde = selectedStation?.popupType === AR_RECON_POPUP_TYPE
    && selectedStation.flight
    && selectedStation.sonde
    ? selectedStation
    : null
  const visibleSelectedSonde = familyState?.sondesVisible
    && selectedSonde
    && selectedFlightIdSet.has(selectedSonde.flight.id)
    ? selectedSonde
    : null
  const visibleHoveredSonde = familyState?.sondesVisible
    && hoveredSonde
    && selectedFlightIdSet.has(hoveredSonde.flight.id)
    ? hoveredSonde
    : null

  return (
    <>
      {visibleHoveredSonde && !visibleSelectedSonde ? (
        <Popup
          anchor="bottom"
          className="ar-recon-sonde-hover-popup"
          closeButton={false}
          closeOnClick={false}
          latitude={visibleHoveredSonde.latitude}
          longitude={visibleHoveredSonde.longitude}
          offset={8}
        >
          <div className="ar-recon-sonde-hover">
            <strong>Sonde {visibleHoveredSonde.sonde.id}</strong>
            <span>{getArReconFlightLabel(visibleHoveredSonde.flight)}</span>
            <span>Click the profile for details</span>
          </div>
        </Popup>
      ) : null}
      {visibleSelectedSonde ? (
        <ArReconSondePopup
          selectedSonde={visibleSelectedSonde}
          onChangeTab={(activeTabId) => {
            setSelectedStation((current) => current?.id === visibleSelectedSonde.id
              ? {
                  ...current,
                  popup: { ...current.popup, activeTabId },
                }
              : current)
          }}
          onClose={() => setSelectedStation(null)}
        />
      ) : null}
    </>
  )
}

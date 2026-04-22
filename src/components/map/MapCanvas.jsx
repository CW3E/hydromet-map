import { useRef, useState } from 'react'
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import { BASEMAP_STYLES, PROJECT_OPTIONS } from '../../config/mapConfig'
import GlobalReachPopup from '../../features/globalReachPopup/GlobalReachPopup'
import { formatCoordinate, formatViewValue } from '../../lib/appState'
import { MAP_LAYER_MODULES } from '../../layers'
import BookmarkControl from './BookmarkControl'
import GlobeProjectionControl from './GlobeProjectionControl'
import MapContextMenu from './MapContextMenu'
import MapHud from './MapHud'
import MapLegend from './MapLegend'
import MapToolDialogs from './MapToolDialogs'
import MapToolOverlays from './MapToolOverlays'
import MouseReadout from './MouseReadout'
import TerrainToggleControl from './TerrainToggleControl'
import useMapTools from './useMapTools'

const INITIAL_INTERACTION_STATE = {
  hoveredB120Point: null,
  hoveredCamaFlood: null,
  hoveredCnrfcPoint: null,
  hoveredGeodar: null,
  hoveredGsha: null,
  hoveredGradesHydroDl: null,
  hoveredGrit: null,
  hoveredHydroRivers: null,
  hoveredMeritBasin: null,
  hoveredRiver: null,
  hoveredSnowCourseStation: null,
  hoveredSnowPillowStation: null,
  hoveredSwordReach: null,
  hoveredYampaPoint: null,
  hoveredUcrbRiver: null,
}

function mergeInteractionState(layerModules, callback) {
  return layerModules.reduce((nextState, layerModule) => {
    const patch = callback(layerModule)
    return patch ? { ...nextState, ...patch } : nextState
  }, {})
}

function hasInteractionStateChanges(currentState, patch) {
  return Object.entries(patch).some(([key, value]) => currentState[key] !== value)
}

export default function MapCanvas({
  activeProject,
  activeProjectId,
  appState,
  basemapMenuRef,
  basemapMenuOpen,
  bookmarkUrl,
  bookmarkOpen,
  bookmarkWidgetRef,
  copyStatus,
  layerMenuOpen,
  layerMenuRef,
  onChangeProject,
  onCloseBookmark,
  onCopyBookmark,
  onToggleBookmark,
  rasterFamily,
  selectedBasemap,
  selectedStation,
  selectedVariable,
  setBasemapMenuOpen,
  setLayerMenuOpen,
  setSelectedStation,
  statusBoundary,
  terrainEnabled,
  toggleLayer,
  updateRaster,
  updateTopLevel,
  viewState,
}) {
  const [interactionState, setInteractionState] = useState(INITIAL_INTERACTION_STATE)
  const [mapInstance, setMapInstance] = useState(null)
  const mapRef = useRef(null)
  const mouseReadoutRef = useRef(null)
  const isDraggingRef = useRef(false)
  const availableLayerIdSet = new Set(activeProject?.availableLayerIds ?? [])

  const layerContext = {
    appState,
    interactionState,
    selectedStation,
    selectedVariable,
    setSelectedStation,
    statusBoundary,
  }

  const visibleLayerModules = MAP_LAYER_MODULES.filter(
    (layerModule) =>
      availableLayerIdSet.has(layerModule.id)
      && (!layerModule.isVisible || layerModule.isVisible(layerContext)),
  )

  const interactiveLayerIds = visibleLayerModules.flatMap(
    (layerModule) => layerModule.getInteractiveLayerIds?.(layerContext) ?? [],
  )

  const mapTools = useMapTools({
    mapInstance,
    setSelectedStation,
  })

  function handleMapMove(event) {
    const nextView = event.viewState
    updateTopLevel('view', {
      center: `${formatCoordinate(nextView.longitude)},${formatCoordinate(nextView.latitude)}`,
      zoom: formatViewValue(nextView.zoom, 2),
      bearing: formatViewValue(nextView.bearing, 1),
      pitch: formatViewValue(nextView.pitch, 1),
    })
  }

  function handlePointerMove(event) {
    mouseReadoutRef.current?.setCoordinates(event.lngLat.lng, event.lngLat.lat)
    mapTools.handlePointerMove(event.lngLat)

    if (isDraggingRef.current) {
      return
    }

    const nextInteractionState = mergeInteractionState(visibleLayerModules, (layerModule) =>
      layerModule.getPointerState?.({ ...layerContext, event }),
    )

    if (Object.keys(nextInteractionState).length > 0) {
      setInteractionState((current) =>
        hasInteractionStateChanges(current, nextInteractionState)
          ? {
              ...current,
              ...nextInteractionState,
            }
          : current,
      )
    }
  }

  function handlePointerLeave() {
    mouseReadoutRef.current?.clear()
    mapTools.handlePointerLeave()

    const nextInteractionState = mergeInteractionState(visibleLayerModules, (layerModule) =>
      layerModule.getPointerLeaveState?.(layerContext),
    )

    if (Object.keys(nextInteractionState).length > 0) {
      setInteractionState((current) =>
        hasInteractionStateChanges(current, nextInteractionState)
          ? {
              ...current,
              ...nextInteractionState,
            }
          : current,
      )
    }
  }

  function handleMapClick(event) {
    if (mapTools.handleMapClick(event)) {
      return
    }

    const handled = visibleLayerModules.some(
      (layerModule) => layerModule.handleClick?.({ ...layerContext, event, setInteractionState }) === true,
    )

    if (!handled) {
      setSelectedStation(null)
    }
  }

  function handleDragStart() {
    isDraggingRef.current = true
    mapTools.handleDragStart()
  }

  function handleDragEnd() {
    window.requestAnimationFrame(() => {
      isDraggingRef.current = false
    })
  }

  return (
    <section className="map-canvas">
      <Map
        {...viewState}
        attributionControl={false}
        interactiveLayerIds={interactiveLayerIds}
        mapStyle={BASEMAP_STYLES[appState.basemapId]}
        projection={appState.projection}
        ref={mapRef}
        reuseMaps
        onLoad={(event) => setMapInstance(event.target)}
        onClick={handleMapClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseLeave={handlePointerLeave}
        onMouseMove={handlePointerMove}
        onMove={handleMapMove}
        style={{ width: '100%', height: '100%' }}
      >
        <MapToolOverlays mapTools={mapTools} />

        {visibleLayerModules.map((layerModule) => (
          <layerModule.renderLayers
            key={layerModule.id}
            {...layerContext}
          />
        ))}

        <NavigationControl position="top-right" visualizePitch />
        <ScaleControl position="bottom-left" unit="metric" />

        {visibleLayerModules.map((layerModule) =>
          layerModule.renderPopups ? (
            <layerModule.renderPopups
              key={`${layerModule.id}-popups`}
              {...layerContext}
            />
          ) : null,
        )}

        {selectedStation?.popupType === 'global-reach' ? (
          <GlobalReachPopup
            ownerLayerId={selectedStation.popupOwnerId}
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
          />
        ) : null}
      </Map>

      <MapHud
        activeProject={activeProject}
        appState={appState}
        basemapMenuRef={basemapMenuRef}
        basemapMenuOpen={basemapMenuOpen}
        layerMenuOpen={layerMenuOpen}
        layerMenuRef={layerMenuRef}
        rasterFamily={rasterFamily}
        selectedBasemap={selectedBasemap}
        setBasemapMenuOpen={setBasemapMenuOpen}
        setLayerMenuOpen={setLayerMenuOpen}
        statusBoundary={statusBoundary}
        toggleLayer={toggleLayer}
        updateRaster={updateRaster}
        updateTopLevel={updateTopLevel}
      />

      {rasterFamily && selectedVariable && appState.layers[rasterFamily.layerId] ? (
        <MapLegend
          palette={selectedVariable.palette}
          units={selectedVariable.units}
          variableLabel={selectedVariable.label}
        />
      ) : null}

      <GlobeProjectionControl
        projection={appState.projection}
        onProjectionChange={(projection) => {
          if (appState.projection !== projection) {
            updateTopLevel('projection', projection)
          }
        }}
      />

      {selectedBasemap.terrainAvailable ? (
        <TerrainToggleControl
          enabled={terrainEnabled}
          mapRef={mapRef}
          onTerrainChange={(terrainIsEnabled) => {
            if (appState.terrainEnabled !== terrainIsEnabled) {
              updateTopLevel('terrainEnabled', terrainIsEnabled)
            }
          }}
        />
      ) : null}

      <MouseReadout ref={mouseReadoutRef} />

      {mapTools.contextMenuState ? (
        <MapContextMenu
          actions={mapTools.contextMenuActions}
          latitude={mapTools.contextMenuState.latitude}
          longitude={mapTools.contextMenuState.longitude}
          menuRef={mapTools.contextMenuRef}
          onClose={mapTools.closeContextMenu}
          x={mapTools.contextMenuState.x}
          y={mapTools.contextMenuState.y}
        />
      ) : null}

      <MapToolDialogs mapTools={mapTools} />

      <div
        className="project-selector"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <div className="project-selector__label">
          <span>Project</span>
          <select
            value={activeProjectId}
            onChange={(event) => onChangeProject(event.target.value)}
          >
            {PROJECT_OPTIONS.map((project) => (
              <option key={project.id} value={project.id}>
                {project.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BookmarkControl
        bookmarkUrl={bookmarkUrl}
        bookmarkOpen={bookmarkOpen}
        bookmarkWidgetRef={bookmarkWidgetRef}
        copyStatus={copyStatus}
        onClose={onCloseBookmark}
        onCopy={onCopyBookmark}
        onToggle={onToggleBookmark}
      />
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import { BASEMAP_STYLES, PROJECT_OPTIONS } from '../../config/mapConfig'
import B120PointPopup from '../../features/b120PointPopup/B120PointPopup'
import CnrfcPointPopup from '../../features/cnrfcPointPopup/CnrfcPointPopup'
import CnrfcStreamflowPopup from '../../features/cnrfcStreamflowPopup/CnrfcStreamflowPopup'
import GlobalReachPopup from '../../features/globalReachPopup/GlobalReachPopup'
import GshaPopup from '../../features/gshaPopup/GshaPopup'
import YampaPointPopup from '../../features/yampaPointPopup/YampaPointPopup'
import { formatCoordinate, formatViewValue, readPopupStateFromUrl } from '../../lib/appState'
import { MAP_LAYER_MODULES } from '../../layers'
import BookmarkControl from './BookmarkControl'
import FamilyStatusDialog from './FamilyStatusDialog'
import GlobeProjectionControl from './GlobeProjectionControl'
import MapContextMenu from './MapContextMenu'
import MapHud from './MapHud'
import MapLegend from './MapLegend'
import ProjectAboutDialog from './ProjectAboutDialog'
import MapToolDialogs from './MapToolDialogs'
import MapToolOverlays from './MapToolOverlays'
import MouseReadout from './MouseReadout'
import OcwdWellPopup from '../../features/ocwdWellPopup/OcwdWellPopup'
import TerrainToggleControl from './TerrainToggleControl'
import useMapTools from './useMapTools'

const INITIAL_INTERACTION_STATE = {
  hoveredB120Point: null,
  hoveredCamaFlood: null,
  hoveredCnrfcStreamflow: null,
  hoveredCnrfcPoint: null,
  hoveredGeodar: null,
  hoveredGsha: null,
  hoveredGradesHydroDl: null,
  hoveredGradesHydroDlDynamic: null,
  hoveredGrit: null,
  hoveredHydroRivers: null,
  hoveredMeritBasin: null,
  hoveredOcwdBoundary: null,
  hoveredOcwdWetland: null,
  hoveredOcwdWell: null,
  hoveredPradoBasin: null,
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

function isMapViewCloseToState(mapInstance, viewState) {
  if (!mapInstance) {
    return true
  }

  const center = mapInstance.getCenter()
  const zoom = mapInstance.getZoom()
  const bearing = mapInstance.getBearing()
  const pitch = mapInstance.getPitch()

  return (
    Math.abs(center.lng - viewState.longitude) < 0.000001
    && Math.abs(center.lat - viewState.latitude) < 0.000001
    && Math.abs(zoom - viewState.zoom) < 0.0001
    && Math.abs(bearing - viewState.bearing) < 0.0001
    && Math.abs(pitch - viewState.pitch) < 0.0001
  )
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
  layerFamily,
  selectedBasemap,
  selectedStation,
  selectedVariable,
  setBasemapMenuOpen,
  setLayerMenuOpen,
  setSelectedStation,
  statusBoundary,
  terrainEnabled,
  toggleLayer,
  updateFamily,
  updateTopLevel,
  viewState,
}) {
  const [interactionState, setInteractionState] = useState(INITIAL_INTERACTION_STATE)
  const [mapInstance, setMapInstance] = useState(null)
  const [familyStatusOpen, setFamilyStatusOpen] = useState(false)
  const [isMapDragging, setIsMapDragging] = useState(false)
  const [projectAboutOpen, setProjectAboutOpen] = useState(false)
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false)
  const mapRef = useRef(null)
  const mouseReadoutRef = useRef(null)
  const isDraggingRef = useRef(false)
  const projectSelectorRef = useRef(null)
  const popupRestoreAttemptedRef = useRef(false)
  const availableLayerIdSet = new Set(activeProject?.availableLayerIds ?? [])
  const projectLogoLabel = activeProject?.logoAlt ?? `${activeProject?.label ?? 'Project'} logo`
  const projectAboutLabel = activeProject?.documentTitle ?? activeProject?.label ?? 'This project'

  const layerContext = {
    appState,
    interactionState,
    layerFamily,
    mapInstance,
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

  function commitMapView(nextView) {
    updateTopLevel('view', {
      center: `${formatCoordinate(nextView.longitude)},${formatCoordinate(nextView.latitude)}`,
      zoom: formatViewValue(nextView.zoom, 2),
      bearing: formatViewValue(nextView.bearing, 1),
      pitch: formatViewValue(nextView.pitch, 1),
    })
  }

  function handleMapMoveEnd(event) {
    if (event.viewState) {
      commitMapView(event.viewState)
    }
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
    setIsMapDragging(true)
    mapTools.handleDragStart()
  }

  function handleDragEnd() {
    window.requestAnimationFrame(() => {
      isDraggingRef.current = false
      setIsMapDragging(false)
    })
  }

  useEffect(() => {
    if (!projectSelectorOpen) {
      return undefined
    }

    function handleDocumentPointerDown(event) {
      if (projectSelectorRef.current?.contains(event.target)) {
        return
      }

      setProjectSelectorOpen(false)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
    }
  }, [projectSelectorOpen])

  useEffect(() => {
    if (!mapInstance || isDraggingRef.current || isMapViewCloseToState(mapInstance, viewState)) {
      return
    }

    mapInstance.jumpTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      bearing: viewState.bearing,
      pitch: viewState.pitch,
    })
  }, [
    mapInstance,
    viewState.bearing,
    viewState.latitude,
    viewState.longitude,
    viewState.pitch,
    viewState.zoom,
  ])

  useEffect(() => {
    if (!mapInstance || selectedStation || popupRestoreAttemptedRef.current) {
      return undefined
    }

    const bookmarkPopup = readPopupStateFromUrl()

    if (!bookmarkPopup) {
      popupRestoreAttemptedRef.current = true
      return undefined
    }

    const layerModule = visibleLayerModules.find((item) => item.id === bookmarkPopup.ownerLayerId)

    if (!layerModule?.restorePopupFromBookmark) {
      popupRestoreAttemptedRef.current = true
      return undefined
    }

    let isCancelled = false
    let timeoutId = null

    function tryRestorePopup() {
      if (isCancelled || popupRestoreAttemptedRef.current) {
        return
      }

      const didRestore = layerModule.restorePopupFromBookmark({
        bookmarkPopup,
        mapInstance,
        setSelectedStation,
        statusBoundary,
      })

      if (didRestore) {
        popupRestoreAttemptedRef.current = true
      }
    }

    mapInstance.once('idle', tryRestorePopup)
    timeoutId = window.setTimeout(() => {
      tryRestorePopup()
      popupRestoreAttemptedRef.current = true
    }, 5000)

    return () => {
      isCancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [mapInstance, selectedStation, setSelectedStation, statusBoundary, visibleLayerModules])

  return (
    <section className={isMapDragging ? 'map-canvas is-map-dragging' : 'map-canvas'}>
      <Map
        attributionControl={false}
        initialViewState={viewState}
        interactiveLayerIds={interactiveLayerIds}
        mapStyle={BASEMAP_STYLES[appState.basemapId]}
        projection={appState.projection}
        ref={mapRef}
        reuseMaps
        onLoad={(event) => {
          setMapInstance(event.target)
          window.__hydrometMap = event.target
        }}
        onClick={handleMapClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseLeave={handlePointerLeave}
        onMouseMove={handlePointerMove}
        onMoveEnd={handleMapMoveEnd}
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

        {selectedStation?.popupType === 'cnrfc-streamflow' ? (
          <CnrfcStreamflowPopup
            ownerLayerId={selectedStation.popupOwnerId}
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
          />
        ) : null}

        {selectedStation?.popupType === 'gsha' ? (
          <GshaPopup
            ownerLayerId={selectedStation.popupOwnerId}
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
          />
        ) : null}

        {selectedStation?.popupType === 'ocwd-well' ? (
          <OcwdWellPopup
            ownerLayerId={selectedStation.popupOwnerId}
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
          />
        ) : null}

        {selectedStation?.popupType === 'b120-points' ? (
          <B120PointPopup
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
          />
        ) : null}

        {selectedStation?.popupType === 'yampa-points' ? (
          <YampaPointPopup
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
          />
        ) : null}

        {selectedStation?.popupType === 'cnrfc-points' ? (
          <CnrfcPointPopup
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
        layerFamily={layerFamily}
        selectedBasemap={selectedBasemap}
        setFamilyStatusOpen={setFamilyStatusOpen}
        setBasemapMenuOpen={setBasemapMenuOpen}
        setLayerMenuOpen={setLayerMenuOpen}
        statusBoundary={statusBoundary}
        toggleLayer={toggleLayer}
        updateFamily={updateFamily}
        updateTopLevel={updateTopLevel}
      />

      {layerFamily && selectedVariable && appState.layers[layerFamily.raster?.layerId] ? (
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

      {activeProject?.about?.markdownUrl ? (
        <button
          className="scene-icon-button project-about-button"
          type="button"
          aria-label={`About ${projectAboutLabel}`}
          title={`About ${projectAboutLabel}`}
          onClick={() => setProjectAboutOpen(true)}
        >
          <svg className="scene-icon-button__about-icon" aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 10v6" />
            <circle cx="12" cy="7.2" r="0.95" />
          </svg>
        </button>
      ) : null}

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

      {activeProject?.logoUrl ? (
        activeProject.logoHref ? (
          <a
            className="project-logo"
            href={activeProject.logoHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={projectLogoLabel}
            title={projectLogoLabel}
          >
            <img src={activeProject.logoUrl} alt={projectLogoLabel} title={projectLogoLabel} />
          </a>
        ) : (
          <div className="project-logo" aria-label={projectLogoLabel} title={projectLogoLabel}>
            <img src={activeProject.logoUrl} alt={projectLogoLabel} title={projectLogoLabel} />
          </div>
        )
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

      <FamilyStatusDialog
        layerFamily={layerFamily}
        onClose={() => setFamilyStatusOpen(false)}
        open={familyStatusOpen}
      />

      <ProjectAboutDialog
        about={activeProject?.about}
        onClose={() => setProjectAboutOpen(false)}
        open={projectAboutOpen}
        projectLabel={activeProject?.label}
      />

      <div
        ref={projectSelectorRef}
        className={projectSelectorOpen ? 'project-selector is-open' : 'project-selector'}
        onMouseEnter={() => setProjectSelectorOpen(true)}
        onMouseLeave={() => setProjectSelectorOpen(false)}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <button
          className="project-selector__trigger"
          type="button"
          aria-label="Project selector"
          title="Project selector"
          onClick={() => setProjectSelectorOpen((current) => !current)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="4.5" y="4.5" width="6" height="6" rx="1.2" ry="1.2" />
            <rect x="13.5" y="4.5" width="6" height="6" rx="1.2" ry="1.2" />
            <rect x="4.5" y="13.5" width="6" height="6" rx="1.2" ry="1.2" />
            <rect x="13.5" y="13.5" width="6" height="6" rx="1.2" ry="1.2" />
          </svg>
        </button>

        <div className="project-selector__panel">
          <div className="project-selector__label">
            <span>Project</span>
            <select
              value={activeProjectId}
              onChange={(event) => {
                onChangeProject(event.target.value)
                setProjectSelectorOpen(false)
              }}
            >
              {PROJECT_OPTIONS.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.label}
                </option>
              ))}
            </select>
          </div>
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

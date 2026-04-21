import { useRef, useState } from 'react'
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import { BASEMAP_STYLES, PROJECT_OPTIONS } from '../../config/mapConfig'
import { formatCoordinate, formatViewValue } from '../../lib/appState'
import { MAP_LAYER_MODULES } from '../../layers'
import BookmarkControl from './BookmarkControl'
import GlobeProjectionControl from './GlobeProjectionControl'
import MapHud from './MapHud'
import MapLegend from './MapLegend'
import MouseReadout from './MouseReadout'
import TerrainToggleControl from './TerrainToggleControl'

const INITIAL_INTERACTION_STATE = {
  hoveredB120Point: null,
  hoveredCnrfcPoint: null,
  hoveredGradesHydroDl: null,
  hoveredMeritBasin: null,
  hoveredRiver: null,
  hoveredSnowCourseStation: null,
  hoveredSnowPillowStation: null,
  hoveredYampaPoint: null,
  hoveredUcrbRiver: null,
}

function mergeInteractionState(layerModules, callback) {
  return layerModules.reduce((nextState, layerModule) => {
    const patch = callback(layerModule)
    return patch ? { ...nextState, ...patch } : nextState
  }, {})
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
  const mapRef = useRef(null)
  const mouseReadoutRef = useRef(null)
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

    const nextInteractionState = mergeInteractionState(visibleLayerModules, (layerModule) =>
      layerModule.getPointerState?.({ ...layerContext, event }),
    )

    if (Object.keys(nextInteractionState).length > 0) {
      setInteractionState((current) => ({
        ...current,
        ...nextInteractionState,
      }))
    }
  }

  function handlePointerLeave() {
    mouseReadoutRef.current?.clear()

    const nextInteractionState = mergeInteractionState(visibleLayerModules, (layerModule) =>
      layerModule.getPointerLeaveState?.(layerContext),
    )

    if (Object.keys(nextInteractionState).length > 0) {
      setInteractionState((current) => ({
        ...current,
        ...nextInteractionState,
      }))
    }
  }

  function handleMapClick(event) {
    const handled = visibleLayerModules.some(
      (layerModule) => layerModule.handleClick?.({ ...layerContext, event, setInteractionState }) === true,
    )

    if (!handled) {
      setSelectedStation(null)
    }
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
        onClick={handleMapClick}
        onMouseLeave={handlePointerLeave}
        onMouseMove={handlePointerMove}
        onMove={handleMapMove}
        style={{ width: '100%', height: '100%' }}
      >
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

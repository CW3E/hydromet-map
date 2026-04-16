import { useState } from 'react'
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import { BASEMAP_STYLES } from '../../config/mapConfig'
import { formatCoordinate, formatViewValue } from '../../lib/appState'
import { MAP_LAYER_MODULES } from '../../layers'
import BookmarkControl from './BookmarkControl'
import GlobeProjectionControl from './GlobeProjectionControl'
import MapHud from './MapHud'
import MapLegend from './MapLegend'
import MouseReadout from './MouseReadout'
import TerrainToggleControl from './TerrainToggleControl'

const INITIAL_INTERACTION_STATE = {
  hoveredRiver: null,
  hoveredSnowCourseStation: null,
  hoveredSnowPillowStation: null,
  hoveredStation: null,
}

function mergeInteractionState(layerModules, callback) {
  return layerModules.reduce((nextState, layerModule) => {
    const patch = callback(layerModule)
    return patch ? { ...nextState, ...patch } : nextState
  }, {})
}

export default function MapCanvas({
  appState,
  basemapMenuRef,
  basemapMenuOpen,
  bookmarkOpen,
  bookmarkWidgetRef,
  copyStatus,
  layerMenuOpen,
  layerMenuRef,
  mouseCoordinates,
  onCloseBookmark,
  onCopyBookmark,
  onMouseMove,
  onToggleBookmark,
  qrCodeUrl,
  selectedBasemap,
  selectedStation,
  selectedVariable,
  setAppState,
  setBasemapMenuOpen,
  setLayerMenuOpen,
  setSelectedStation,
  terrainEnabled,
  toggleLayer,
  updateRaster,
  updateTopLevel,
  viewState,
}) {
  const [interactionState, setInteractionState] = useState(INITIAL_INTERACTION_STATE)

  const layerContext = {
    appState,
    interactionState,
    selectedStation,
    selectedVariable,
    setSelectedStation,
  }

  const visibleLayerModules = MAP_LAYER_MODULES.filter(
    (layerModule) => !layerModule.isVisible || layerModule.isVisible(layerContext),
  )

  const interactiveLayerIds = visibleLayerModules.flatMap(
    (layerModule) => layerModule.getInteractiveLayerIds?.(layerContext) ?? [],
  )

  function handleMapMove(event) {
    const nextView = event.viewState
    setAppState((current) => ({
      ...current,
      view: {
        center: `${formatCoordinate(nextView.longitude)},${formatCoordinate(nextView.latitude)}`,
        zoom: formatViewValue(nextView.zoom, 2),
        bearing: formatViewValue(nextView.bearing, 1),
        pitch: formatViewValue(nextView.pitch, 1),
      },
    }))
  }

  function handlePointerMove(event) {
    onMouseMove(event)

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
        <GlobeProjectionControl
          onProjectionChange={(projection) => {
            setAppState((current) =>
              current.projection === projection
                ? current
                : {
                    ...current,
                    projection,
                  },
            )
          }}
        />
        {selectedBasemap.terrainAvailable ? (
          <TerrainToggleControl
            enabled={terrainEnabled}
            onTerrainChange={(terrainIsEnabled) => {
              setAppState((current) =>
                current.terrainEnabled === terrainIsEnabled
                  ? current
                  : {
                      ...current,
                      terrainEnabled: terrainIsEnabled,
                    },
              )
            }}
          />
        ) : null}
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
        appState={appState}
        basemapMenuRef={basemapMenuRef}
        basemapMenuOpen={basemapMenuOpen}
        layerMenuOpen={layerMenuOpen}
        layerMenuRef={layerMenuRef}
        selectedBasemap={selectedBasemap}
        setBasemapMenuOpen={setBasemapMenuOpen}
        setLayerMenuOpen={setLayerMenuOpen}
        toggleLayer={toggleLayer}
        updateRaster={updateRaster}
        updateTopLevel={updateTopLevel}
      />

      {appState.layers.raster ? (
        <MapLegend
          palette={selectedVariable.palette}
          units={selectedVariable.units}
          variableLabel={selectedVariable.label}
        />
      ) : null}

      <MouseReadout mouseCoordinates={mouseCoordinates} />

      <BookmarkControl
        bookmarkOpen={bookmarkOpen}
        bookmarkWidgetRef={bookmarkWidgetRef}
        copyStatus={copyStatus}
        onClose={onCloseBookmark}
        onCopy={onCopyBookmark}
        onToggle={onToggleBookmark}
        qrCodeUrl={qrCodeUrl}
      />
    </section>
  )
}

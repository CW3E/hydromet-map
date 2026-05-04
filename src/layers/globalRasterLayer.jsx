import { Layer, Source } from 'react-map-gl/maplibre'
import { RASTER_PLACEHOLDER_GEOJSON } from '../data/placeholderOverlays'

const GLOBAL_RASTER_LAYER_ID = 'globalRaster'

const globalRasterLayer = {
  id: GLOBAL_RASTER_LAYER_ID,
  isVisible: ({ appState, selectedVariable }) =>
    appState.layers[GLOBAL_RASTER_LAYER_ID] && Boolean(selectedVariable),
  renderLayers({ appState, selectedVariable }) {
    if (!selectedVariable) {
      return null
    }

    const rasterUrl = selectedVariable.buildRasterUrl?.(appState.family)
    const rasterCoordinates = selectedVariable.coordinates

    if (rasterUrl && rasterCoordinates) {
      return (
        <Source
          id="global-raster-source"
          type="image"
          url={rasterUrl}
          coordinates={rasterCoordinates}
        >
          <Layer
            id="global-raster-image-layer"
            type="raster"
            paint={{
              'raster-opacity': 0.7,
            }}
          />
        </Source>
      )
    }

    return (
      <Source id="global-raster-source" type="geojson" data={RASTER_PLACEHOLDER_GEOJSON}>
        <Layer
          id="global-raster-fill"
          type="fill"
          paint={{
            'fill-color': selectedVariable.palette.colors[selectedVariable.palette.colors.length - 1],
            'fill-opacity': 0.22,
          }}
        />
        <Layer
          id="global-raster-outline"
          type="line"
          paint={{
            'line-color': selectedVariable.palette.colors[selectedVariable.palette.colors.length - 2],
            'line-width': 2,
            'line-dasharray': [2, 2],
          }}
        />
      </Source>
    )
  },
}

export default globalRasterLayer

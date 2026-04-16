import { Layer, Source } from 'react-map-gl/maplibre'
import { RASTER_PLACEHOLDER_GEOJSON } from '../data/demoOverlays'

const rasterLayer = {
  id: 'raster',
  isVisible: ({ appState }) => appState.layers.raster,
  renderLayers({ appState, selectedVariable }) {
    const rasterUrl = selectedVariable.buildRasterUrl?.(appState.raster)
    const rasterCoordinates = selectedVariable.coordinates

    if (rasterUrl && rasterCoordinates) {
      return (
        <Source
          id="raster-source"
          type="image"
          url={rasterUrl}
          coordinates={rasterCoordinates}
        >
          <Layer
            id="raster-image-layer"
            type="raster"
            paint={{
              'raster-opacity': 0.7,
            }}
          />
        </Source>
      )
    }

    return (
      <Source id="raster-source" type="geojson" data={RASTER_PLACEHOLDER_GEOJSON}>
        <Layer
          id="raster-fill"
          type="fill"
          paint={{
            'fill-color': selectedVariable.palette.colors[selectedVariable.palette.colors.length - 1],
            'fill-opacity': 0.22,
          }}
        />
        <Layer
          id="raster-outline"
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

export default rasterLayer

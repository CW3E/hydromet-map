import { Layer, Source } from 'react-map-gl/maplibre'

const B120_BASINS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/b120/csv/b120_basins_24.geojson'
const B120_BASIN_LABEL_SIZE = ['interpolate', ['linear'], ['zoom'], 0, 12, 5, 14, 12, 22]

const b120BasinsLayer = {
  id: 'b120Basins',
  isVisible: ({ appState }) => appState.layers.b120Basins,
  renderLayers({ interactionState }) {
    return (
      <Source id="b120-basins-source" type="geojson" data={B120_BASINS_GEOJSON_URL}>
        <Layer
          id="b120-basins-highlight-fill"
          type="fill"
          filter={['==', ['get', 'ID'], interactionState.hoveredB120Point?.stationId ?? '__none__']}
          paint={{
            'fill-color': '#0b3b8f',
            'fill-opacity': 0.22,
          }}
        />
        <Layer
          id="b120-basins-outline"
          type="line"
          paint={{
            'line-color': '#0b3b8f',
            'line-width': 2,
            'line-opacity': 1,
          }}
        />
        <Layer
          id="b120-basins-labels"
          type="symbol"
          minzoom={5.4}
          layout={{
            'text-field': ['get', 'ID'],
            'text-size': B120_BASIN_LABEL_SIZE,
            'text-font': ['Noto Sans Regular'],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          }}
          paint={{
            'text-color': '#0b3b8f',
            'text-halo-color': 'rgba(255,255,255,0.75)',
            'text-halo-width': 1,
          }}
        />
      </Source>
    )
  },
}

export default b120BasinsLayer

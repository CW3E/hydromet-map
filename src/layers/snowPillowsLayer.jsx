import createSnowStationLayer from './snowStationLayerFactory'
import { SNOW_PILLOWS_POPUP_DEFINITION } from '../features/snowStationPopup/snowStationPopupConfig'

const SNOW_PILLOWS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/snowpillow.geojson'

const snowPillowsLayer = createSnowStationLayer({
  id: 'snowPillows',
  sourceId: 'snow-pillows-source',
  layerId: 'snow-pillows-layer',
  highlightLayerId: 'snow-pillows-highlight-layer',
  hitSourceId: 'snow-pillows-hit-source',
  hitLayerId: 'snow-pillows-hit-layer',
  data: SNOW_PILLOWS_GEOJSON_URL,
  circleColor: '#ff8c00',
  popupDefinition: SNOW_PILLOWS_POPUP_DEFINITION,
  stateKey: 'hoveredSnowPillowStation',
})

export default snowPillowsLayer

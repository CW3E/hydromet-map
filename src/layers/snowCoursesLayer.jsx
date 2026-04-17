import createSnowStationLayer from './snowStationLayerFactory'
import { SNOW_COURSES_POPUP_DEFINITION } from '../features/snowStationPopup/snowStationPopupConfig'

const SNOW_COURSES_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/snowcourse.geojson'

const snowCoursesLayer = createSnowStationLayer({
  id: 'snowCourses',
  sourceId: 'snow-courses-source',
  layerId: 'snow-courses-layer',
  highlightLayerId: 'snow-courses-highlight-layer',
  hitSourceId: 'snow-courses-hit-source',
  hitLayerId: 'snow-courses-hit-layer',
  data: SNOW_COURSES_GEOJSON_URL,
  circleColor: '#8b4513',
  popupDefinition: SNOW_COURSES_POPUP_DEFINITION,
  stateKey: 'hoveredSnowCourseStation',
})

export default snowCoursesLayer

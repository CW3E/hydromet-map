import b120BasinsLayer from './b120BasinsLayer'
import b120PointsLayer from './b120PointsLayer'
import cnrfcRegionLayer from './cnrfcRegionLayer'
import rasterLayer from './rasterLayer'
import riversLayer from './riversLayer'
import snowCoursesLayer from './snowCoursesLayer'
import snowPillowsLayer from './snowPillowsLayer'
import stationsLayer from './stationsLayer'
import watershedsLayer from './watershedsLayer'

export const MAP_LAYER_MODULES = [
  watershedsLayer,
  b120PointsLayer,
  b120BasinsLayer,
  riversLayer,
  rasterLayer,
  cnrfcRegionLayer,
  stationsLayer,
  snowCoursesLayer,
  snowPillowsLayer,
]

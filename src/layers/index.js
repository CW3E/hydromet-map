import cnrfcRegionLayer from './cnrfcRegionLayer'
import rasterLayer from './rasterLayer'
import riversLayer from './riversLayer'
import snowCoursesLayer from './snowCoursesLayer'
import snowPillowsLayer from './snowPillowsLayer'
import stationsLayer from './stationsLayer'
import watershedsLayer from './watershedsLayer'

export const MAP_LAYER_MODULES = [
  watershedsLayer,
  riversLayer,
  rasterLayer,
  cnrfcRegionLayer,
  stationsLayer,
  snowCoursesLayer,
  snowPillowsLayer,
]

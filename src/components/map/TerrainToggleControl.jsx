import { useEffect, useRef } from 'react'
import { useControl, useMap } from 'react-map-gl/maplibre'
import { TERRAIN_SPEC } from '../../config/mapConfig'

export default function TerrainToggleControl({ enabled, onTerrainChange }) {
  const { current: map } = useMap()
  const callbackRef = useRef(onTerrainChange)

  callbackRef.current = onTerrainChange

  useControl(({ mapLib }) => new mapLib.TerrainControl(TERRAIN_SPEC), { position: 'top-right' })

  useEffect(() => {
    if (!map) {
      return undefined
    }

    const mapInstance = map.getMap()
    const syncTerrain = () => {
      callbackRef.current(Boolean(mapInstance.getTerrain()))
    }

    mapInstance.on('terrain', syncTerrain)

    return () => {
      mapInstance.off('terrain', syncTerrain)
    }
  }, [map])

  useEffect(() => {
    if (!map) {
      return
    }

    const mapInstance = map.getMap()

    const syncDesiredTerrain = () => {
      const terrainSourceExists = Boolean(mapInstance.getSource(TERRAIN_SPEC.source))

      if (enabled) {
        if (terrainSourceExists && !mapInstance.getTerrain()) {
          mapInstance.setTerrain(TERRAIN_SPEC)
        }
        return
      }

      if (mapInstance.getTerrain()) {
        mapInstance.setTerrain(null)
      }
    }

    syncDesiredTerrain()
    mapInstance.on('styledata', syncDesiredTerrain)

    return () => {
      mapInstance.off('styledata', syncDesiredTerrain)
    }
  }, [enabled, map])

  return null
}

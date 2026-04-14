import { useEffect, useRef } from 'react'
import { useControl, useMap } from 'react-map-gl/maplibre'

export default function GlobeProjectionControl({ onProjectionChange }) {
  const { current: map } = useMap()
  const callbackRef = useRef(onProjectionChange)

  callbackRef.current = onProjectionChange

  useControl(({ mapLib }) => new mapLib.GlobeControl(), { position: 'top-right' })

  useEffect(() => {
    if (!map) {
      return undefined
    }

    const mapInstance = map.getMap()
    const syncProjection = () => {
      const projectionType = mapInstance.getProjection()?.type === 'globe' ? 'globe' : 'mercator'
      callbackRef.current(projectionType)
    }

    mapInstance.on('projectiontransition', syncProjection)

    return () => {
      mapInstance.off('projectiontransition', syncProjection)
    }
  }, [map])

  return null
}

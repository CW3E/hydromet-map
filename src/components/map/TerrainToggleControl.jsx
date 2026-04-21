import { useEffect } from 'react'
import { TERRAIN_SPEC } from '../../config/mapConfig'

function TerrainIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4 18l4.8-6.2 2.9 3.5 3.4-5 4.9 7.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M4 18h16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export default function TerrainToggleControl({ enabled, mapRef, onTerrainChange }) {
  useEffect(() => {
    const map = mapRef?.current?.getMap?.()

    if (!map) {
      return
    }

    const syncDesiredTerrain = () => {
      const terrainSourceExists = Boolean(map.getSource(TERRAIN_SPEC.source))

      if (enabled) {
        if (terrainSourceExists && !map.getTerrain()) {
          map.setTerrain(TERRAIN_SPEC)
        }
        return
      }

      if (map.getTerrain()) {
        map.setTerrain(null)
      }
    }

    syncDesiredTerrain()
    map.on('styledata', syncDesiredTerrain)

    return () => {
      map.off('styledata', syncDesiredTerrain)
    }
  }, [enabled, mapRef])

  return (
    <div className="terrain-widget">
      <button
        className={`terrain-trigger${enabled ? ' terrain-trigger--active' : ''}`}
        type="button"
        title={enabled ? 'Disable terrain' : 'Enable terrain'}
        aria-label={enabled ? 'Disable terrain' : 'Enable terrain'}
        aria-pressed={enabled ? 'true' : 'false'}
        onClick={() => onTerrainChange(!enabled)}
      >
        <TerrainIcon />
      </button>
    </div>
  )
}

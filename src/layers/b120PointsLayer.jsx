import { useEffect, useMemo, useState } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'

const B120_POINTS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/b120/csv/b120_stations_24.geojson'
const B120_BASINS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/b120/csv/b120_basins_24.geojson'
const B120_POINT_RADIUS = ['interpolate', ['linear'], ['zoom'], 0, 4, 5, 4, 6, 6, 12, 10]

function buildHoveredB120Point(event, feature) {
  const properties = feature?.properties ?? {}

  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    stationId: properties.Station_ID ?? 'Unknown',
    basin: properties.Basin ?? 'Unknown',
    location: properties.Location ?? 'Unknown',
  }
}

function buildB120BasinInfo(feature) {
  const properties = feature?.properties ?? {}
  const rawArea = properties.Area_sqmi
  const numericArea = typeof rawArea === 'number' ? rawArea : Number.parseFloat(rawArea)

  return {
    id: properties.ID ?? 'Unknown',
    station: properties.TATION ?? properties.STATION ?? 'Unknown',
    areaSqMi: Number.isFinite(numericArea) ? numericArea.toFixed(0) : 'Unknown',
    elevation: properties.ELEV ?? 'Unknown',
    county: properties.COUNTY___ ?? 'Unknown',
    operator: properties.OPERATOR_A ?? 'Unknown',
  }
}

const b120PointsLayer = {
  id: 'b120Points',
  stateKey: 'hoveredB120Point',
  isVisible: ({ appState }) => appState.layers.b120Points,
  getInteractiveLayerIds() {
    return ['b120-points-hit-layer']
  },
  getPointerState({ event }) {
    const hoveredFeature = event.features?.find((feature) => feature.layer.id === 'b120-points-hit-layer')
    const hoveredPoint = hoveredFeature ? buildHoveredB120Point(event, hoveredFeature) : null

    if (!hoveredPoint) {
      return {
        hoveredB120Point: null,
      }
    }

    return {
      hoveredB120Point: hoveredPoint,
    }
  },
  getPointerLeaveState() {
    return { hoveredB120Point: null }
  },
  renderLayers({ interactionState }) {
    return (
      <>
        <Source id="b120-points-source" type="geojson" data={B120_POINTS_GEOJSON_URL}>
          <Layer
            id="b120-points-layer"
            type="circle"
            paint={{
              'circle-radius': B120_POINT_RADIUS,
              'circle-color': '#00ffff',
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 1,
            }}
          />
          <Layer
            id="b120-points-highlight-layer"
            type="circle"
            filter={['==', ['get', 'Station_ID'], interactionState.hoveredB120Point?.stationId ?? '__none__']}
            paint={{
              'circle-radius': B120_POINT_RADIUS,
              'circle-color': '#c62828',
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 1,
            }}
          />
        </Source>

        <Source id="b120-points-hit-source" type="geojson" data={B120_POINTS_GEOJSON_URL}>
          <Layer
            id="b120-points-hit-layer"
            type="circle"
            paint={{
              'circle-radius': 14,
              'circle-color': '#000000',
              'circle-opacity': 0,
            }}
          />
        </Source>
      </>
    )
  },
  renderPopups({ interactionState }) {
    const [basinInfoById, setBasinInfoById] = useState({})
    const hoveredB120Point = interactionState.hoveredB120Point
    const basinInfo = useMemo(
      () => (hoveredB120Point ? basinInfoById[hoveredB120Point.stationId] ?? null : null),
      [basinInfoById, hoveredB120Point],
    )

    useEffect(() => {
      let isCancelled = false

      async function loadBasinInfo() {
        try {
          const response = await fetch(B120_BASINS_GEOJSON_URL)

          if (!response.ok) {
            return
          }

          const geojson = await response.json()
          const nextBasinInfoById = Object.fromEntries(
            (geojson?.features ?? []).map((feature) => {
              const basinInfo = buildB120BasinInfo(feature)
              return [basinInfo.id, basinInfo]
            }),
          )

          if (!isCancelled) {
            setBasinInfoById(nextBasinInfoById)
          }
        } catch {
          if (!isCancelled) {
            setBasinInfoById({})
          }
        }
      }

      loadBasinInfo()

      return () => {
        isCancelled = true
      }
    }, [])

    if (!hoveredB120Point) {
      return null
    }

    return (
      <Popup
        anchor="bottom"
        closeButton={false}
        closeOnClick={false}
        latitude={hoveredB120Point.latitude}
        longitude={hoveredB120Point.longitude}
        offset={10}
      >
        <div className="river-popup">
          {basinInfo ? (
            <>
              <strong>ID: {basinInfo.id}</strong>
              <p>Station: {basinInfo.station}</p>
              <p>Area: {basinInfo.areaSqMi} mi²</p>
              <p>Elevation: {basinInfo.elevation} ft</p>
              <p>County: {basinInfo.county}</p>
              <p>Operator: {basinInfo.operator}</p>
            </>
          ) : (
            <>
              <strong>ID: {hoveredB120Point.stationId}</strong>
              <p>Basin: {hoveredB120Point.basin}</p>
              <p>Location: {hoveredB120Point.location}</p>
            </>
          )}
        </div>
      </Popup>
    )
  },
}

export default b120PointsLayer

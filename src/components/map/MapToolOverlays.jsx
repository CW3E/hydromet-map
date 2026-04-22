import { Layer, Source } from 'react-map-gl/maplibre'

function buildMeasurementGeoJson(start, end, label, endRole = 'end') {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [start.longitude, start.latitude],
            [end.longitude, end.latitude],
          ],
        },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [start.longitude, start.latitude],
        },
        properties: {
          role: 'start',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [end.longitude, end.latitude],
        },
        properties: {
          role: endRole,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            (start.longitude + end.longitude) / 2,
            (start.latitude + end.latitude) / 2,
          ],
        },
        properties: {
          role: 'label',
          label,
        },
      },
    ],
  }
}

export default function MapToolOverlays({ mapTools }) {
  const {
    identifiedFlowpath,
    identifiedUpstreamRivers,
    identifiedWatershed,
    measurementPreviewDistanceKm,
    measurementPreviewEnd,
    measurementResult,
    measurementStart,
  } = mapTools

  return (
    <>
      {identifiedWatershed ? (
        <Source id="identified-watershed-source" type="geojson" data={identifiedWatershed.geojson}>
          <Layer
            id="identified-watershed-fill"
            type="fill"
            paint={{
              'fill-color': '#2563eb',
              'fill-opacity': 0.16,
            }}
          />
          <Layer
            id="identified-watershed-outline"
            type="line"
            paint={{
              'line-color': '#2563eb',
              'line-width': 2,
              'line-opacity': 0.9,
            }}
          />
        </Source>
      ) : null}

      {identifiedUpstreamRivers ? (
        <Source id="identified-upstream-rivers-source" type="geojson" data={identifiedUpstreamRivers.geojson}>
          <Layer
            id="identified-upstream-rivers-line"
            type="line"
            paint={{
              'line-color': '#2563eb',
              'line-width': 2,
              'line-opacity': 0.9,
            }}
          />
        </Source>
      ) : null}

      {identifiedFlowpath ? (
        <Source id="identified-flowpath-source" type="geojson" data={identifiedFlowpath.geojson}>
          <Layer
            id="identified-flowpath-line"
            type="line"
            paint={{
              'line-color': '#dc2626',
              'line-width': 4,
              'line-opacity': 0.95,
            }}
          />
        </Source>
      ) : null}

      {measurementResult ? (
        <Source
          id="measurement-line-source"
          type="geojson"
          data={buildMeasurementGeoJson(
            measurementResult.start,
            measurementResult.end,
            `${measurementResult.distanceKm.toFixed(2)} km`,
            'end',
          )}
        >
          <Layer
            id="measurement-line"
            type="line"
            filter={['==', ['geometry-type'], 'LineString']}
            paint={{
              'line-color': '#111827',
              'line-width': 2.5,
              'line-dasharray': [2, 1],
            }}
          />
          <Layer
            id="measurement-points"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-radius': 5,
              'circle-color': [
                'match',
                ['get', 'role'],
                'start',
                '#2563eb',
                'end',
                '#dc2626',
                '#111827',
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            }}
          />
          <Layer
            id="measurement-line-label"
            type="symbol"
            filter={['==', ['get', 'role'], 'label']}
            layout={{
              'text-field': ['get', 'label'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12,
              'text-offset': [0, -1],
              'text-anchor': 'bottom',
            }}
            paint={{
              'text-color': '#111827',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            }}
          />
        </Source>
      ) : null}

      {measurementStart && measurementPreviewEnd && measurementPreviewDistanceKm != null ? (
        <Source
          id="measurement-preview-source"
          type="geojson"
          data={buildMeasurementGeoJson(
            measurementStart,
            measurementPreviewEnd,
            `${measurementPreviewDistanceKm.toFixed(2)} km`,
            'preview',
          )}
        >
          <Layer
            id="measurement-preview-line"
            type="line"
            filter={['==', ['geometry-type'], 'LineString']}
            paint={{
              'line-color': '#111827',
              'line-width': 2,
              'line-opacity': 0.75,
              'line-dasharray': [1.5, 1],
            }}
          />
          <Layer
            id="measurement-preview-points"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-radius': 5,
              'circle-color': [
                'match',
                ['get', 'role'],
                'start',
                '#2563eb',
                'preview',
                '#111827',
                '#111827',
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            }}
          />
          <Layer
            id="measurement-preview-label"
            type="symbol"
            filter={['==', ['get', 'role'], 'label']}
            layout={{
              'text-field': ['get', 'label'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12,
              'text-offset': [0, -1],
              'text-anchor': 'bottom',
            }}
            paint={{
              'text-color': '#111827',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            }}
          />
        </Source>
      ) : null}
    </>
  )
}

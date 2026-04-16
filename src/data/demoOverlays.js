export const WATERSHEDS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Sacramento Basin' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-123.1, 39.6],
          [-121.1, 40.25],
          [-119.4, 39.75],
          [-119.8, 37.9],
          [-121.7, 37.35],
          [-123.1, 39.6],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'San Joaquin Basin' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.2, 37.75],
          [-120.2, 38.15],
          [-118.9, 37.2],
          [-119.4, 35.55],
          [-121.55, 35.45],
          [-122.2, 37.75],
        ]],
      },
    },
  ],
}

export const RIVERS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Sacramento River' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-122.35, 40.5],
          [-121.9, 39.7],
          [-121.65, 39.05],
          [-121.55, 38.55],
          [-121.5, 38.1],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'San Joaquin River' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-119.7, 37.4],
          [-119.75, 36.8],
          [-120.0, 36.25],
          [-120.25, 35.85],
        ],
      },
    },
  ],
}

export const STATIONS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'SAC-01', name: 'Upper Basin Station', variable: 'Streamflow' },
      geometry: { type: 'Point', coordinates: [-121.76, 39.28] },
    },
    {
      type: 'Feature',
      properties: { id: 'SJV-14', name: 'Valley Forecast Point', variable: 'Precipitation' },
      geometry: { type: 'Point', coordinates: [-120.44, 37.31] },
    },
    {
      type: 'Feature',
      properties: { id: 'COA-07', name: 'Coastal Wind Station', variable: 'Wind Gust' },
      geometry: { type: 'Point', coordinates: [-122.07, 36.96] },
    },
  ],
}

export const RADAR_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { intensity: 'moderate' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.2, 38.85],
          [-120.4, 39.15],
          [-119.85, 38.2],
          [-121.2, 37.35],
          [-122.35, 38.0],
          [-122.2, 38.85],
        ]],
      },
    },
  ],
}

export const RASTER_PLACEHOLDER_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { zone: 'Central Forecast Swath' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-121.85, 38.85],
          [-119.45, 38.95],
          [-118.95, 36.55],
          [-121.15, 36.25],
          [-121.85, 38.85],
        ]],
      },
    },
  ],
}

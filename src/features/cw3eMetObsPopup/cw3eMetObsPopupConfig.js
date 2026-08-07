import { buildCsvDownloadFileName } from '../../lib/csvExport'
import {
  DEFAULT_TIMESERIES_LAYOUT,
  DEFAULT_TIMESERIES_PLOTLY_CONFIG,
  TIMESERIES_POPUP_WIDTH,
} from '../cnrfcPointPopup/cnrfcPointPopupConfig'

const CW3E_MET_OBS_CSV_ROOT = 'https://cw3e.ucsd.edu/hydro/cw3e_obs/csv/hourly'

export const CW3E_MET_OBS_POPUP_WIDTH = TIMESERIES_POPUP_WIDTH

function buildObservationUrl({ stationId }) {
  const url = new URL(`${CW3E_MET_OBS_CSV_ROOT}/${encodeURIComponent(stationId)}/latest_183d.csv`)
  url.searchParams.set('refresh', Date.now().toString())
  return url.toString()
}

function buildDownloadFileName(context) {
  return buildCsvDownloadFileName({
    prefix: 'cw3e-met-obs',
    stationId: context.station?.id ?? 'station',
    plotId: context.plotDefinition?.id,
    sourceId: context.sourceId,
    defaultFileName: context.defaultFileName,
  })
}

const SOIL_MOISTURE_COLORS = ['#0c4a6e', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc']
const SOIL_TEMPERATURE_COLORS = ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c']

function parseSoilDepth(column, variable) {
  const match = new RegExp(`^soil_${variable}_(\\d+(?:p\\d+)?)cm_`).exec(column)
  if (!match) return null
  const numericDepth = Number.parseFloat(match[1].replace('p', '.'))
  return Number.isFinite(numericDepth) ? numericDepth : null
}

function buildSoilAndSnowSeries({ sourceRecords }) {
  const fields = sourceRecords.hourly?.fields ?? []
  const definitions = [
    {
      variable: 'moisture',
      suffix: 'pct',
      label: 'Soil Moisture',
      axis: 'y',
      colors: SOIL_MOISTURE_COLORS,
    },
    {
      variable: 'temperature',
      suffix: 'c',
      label: 'Soil Temperature',
      axis: 'y2',
      colors: SOIL_TEMPERATURE_COLORS,
      minimumValue: -100,
    },
  ]

  return Object.fromEntries([
    ...definitions.flatMap((definition) =>
      fields
        .map((column) => ({
          column,
          depth: parseSoilDepth(column, definition.variable),
        }))
        .filter(({ column, depth }) =>
          depth != null && column.endsWith(`_${definition.suffix}`),
        )
        .sort((left, right) => left.depth - right.depth)
        .map(({ column, depth }, index) => [
          column,
          {
            sourceId: 'hourly',
            column,
            xField: 'timestamp',
            label: `${definition.label} (${depth} cm)`,
            type: 'scatter',
            mode: 'lines',
            line: {
              color: definition.colors[index % definition.colors.length],
              width: 1.3,
            },
            yAxis: definition.axis,
            ...(definition.minimumValue != null ? { minimumValue: definition.minimumValue } : {}),
          },
        ]),
    ),
    ...(fields.includes('snow_depth_m') ? [[
      'snowDepth',
      {
        sourceId: 'hourly',
        column: 'snow_depth_m',
        xField: 'timestamp',
        label: 'Snow Depth',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#db2777', width: 1.6 },
        yAxis: 'y3',
      },
    ]] : []),
  ])
}

export const CW3E_MET_OBS_POPUP_TABS = [
  {
    id: 'precipitation',
    label: 'Surface Meteorology',
    plots: [
      {
        id: 'precipitation',
        sources: [{ id: 'hourly', buildUrl: buildObservationUrl }],
        hovermode: 'x unified',
        titleTemplate: '{stationName} ({stationId}) — Latest 6 Months',
        layout: {
          ...DEFAULT_TIMESERIES_LAYOUT,
          bargap: 0.08,
        },
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        csvDownload: {
          enabled: true,
          fileName: buildDownloadFileName,
        },
        xAxis: {
          title: { text: 'Time' },
        },
        axes: {
          y: {
            title: { text: 'Precipitation (mm)', font: { color: '#2563eb' }, standoff: 0 },
            tickfont: { color: '#2563eb' },
            rangemode: 'tozero',
            zeroline: true,
          },
          y2: {
            title: { text: 'Temperature (°C)', font: { color: '#ea580c' }, standoff: 0 },
            tickfont: { color: '#ea580c' },
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            zeroline: false,
          },
          y3: {
            title: { text: 'Relative Humidity (%)', font: { color: '#16a34a' }, standoff: 0 },
            tickfont: { color: '#16a34a' },
            range: [0, 100],
            overlaying: 'y',
            side: 'left',
            showgrid: false,
            zeroline: false,
          },
          y4: {
            title: { text: 'Solar Radiation (W/m²)', font: { color: '#ca8a04' }, standoff: 0 },
            tickfont: { color: '#ca8a04' },
            rangemode: 'tozero',
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            zeroline: false,
          },
          y5: {
            title: { text: 'Wind Speed (m/s)', font: { color: '#7c3aed' }, standoff: 0 },
            tickfont: { color: '#7c3aed' },
            rangemode: 'tozero',
            overlaying: 'y',
            side: 'left',
            showgrid: false,
            zeroline: false,
          },
          y6: {
            title: { text: 'Pressure (hPa)', font: { color: '#475569' }, standoff: 0 },
            tickfont: { color: '#475569' },
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            zeroline: false,
          },
        },
        series: {
          precipitation: {
            sourceId: 'hourly',
            column: 'precipitation_mm',
            xField: 'timestamp',
            label: 'Precipitation',
            type: 'bar',
            marker: { color: '#2563eb' },
          },
          temperature: {
            sourceId: 'hourly',
            column: 'temperature_c',
            xField: 'timestamp',
            label: 'Temperature',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#ea580c', width: 1.5 },
            yAxis: 'y2',
            minimumValue: -100,
          },
          relativeHumidity: {
            sourceId: 'hourly',
            column: 'relative_humidity_pct',
            xField: 'timestamp',
            label: 'Relative Humidity',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#16a34a', width: 1.2 },
            yAxis: 'y3',
            visible: 'legendonly',
          },
          solarRadiation: {
            sourceId: 'hourly',
            column: 'solar_radiation_wm2',
            xField: 'timestamp',
            label: 'Solar Radiation',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#ca8a04', width: 1.2 },
            yAxis: 'y4',
            visible: 'legendonly',
          },
          windSpeed: {
            sourceId: 'hourly',
            column: 'wind_speed_ms',
            xField: 'timestamp',
            label: 'Wind Speed',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#7c3aed', width: 1.2 },
            yAxis: 'y5',
            visible: 'legendonly',
          },
          pressure: {
            sourceId: 'hourly',
            column: 'pressure_hpa',
            xField: 'timestamp',
            label: 'Pressure',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#475569', width: 1.2 },
            yAxis: 'y6',
          },
        },
      },
    ],
  },
  {
    id: 'soil',
    label: 'Soil and Snow',
    plots: [
      {
        id: 'soil',
        sources: [{ id: 'hourly', buildUrl: buildObservationUrl }],
        hovermode: 'x unified',
        titleTemplate: '{stationName} ({stationId}) — Soil and Snow Conditions, Latest 6 Months',
        layout: DEFAULT_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        csvDownload: {
          enabled: true,
          fileName: buildDownloadFileName,
        },
        xAxis: {
          title: { text: 'Time' },
        },
        axes: {
          y: {
            title: { text: 'Soil Moisture (%)', font: { color: '#0284c7' }, standoff: 0 },
            tickfont: { color: '#0284c7' },
            rangemode: 'tozero',
            zeroline: true,
          },
          y2: {
            title: { text: 'Soil Temperature (°C)', font: { color: '#ea580c' }, standoff: 0 },
            tickfont: { color: '#ea580c' },
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            zeroline: false,
          },
          y3: {
            title: { text: 'Snow Depth (m)', font: { color: '#db2777' }, standoff: 0 },
            tickfont: { color: '#db2777' },
            rangemode: 'tozero',
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            zeroline: false,
          },
        },
        buildSeries: buildSoilAndSnowSeries,
      },
    ],
  },
]

export function getCw3eMetObsPopupTabDefinition(tabId) {
  return CW3E_MET_OBS_POPUP_TABS.find((tab) => tab.id === tabId) ?? null
}

export function getDefaultCw3eMetObsPopupTabId() {
  return CW3E_MET_OBS_POPUP_TABS[0]?.id ?? 'precipitation'
}

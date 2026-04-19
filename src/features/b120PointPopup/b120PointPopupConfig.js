import {
  DEFAULT_TIMESERIES_LAYOUT,
  DEFAULT_TIMESERIES_PLOTLY_CONFIG,
  STATION_POPUP_WIDTH,
} from '../stationPopup/stationPopupConfig'

function formatCompactDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function formatMonthYearLabel(value) {
  const parsedDate = parseDateString(String(value ?? ''))

  if (!parsedDate) {
    return value ?? ''
  }

  return parsedDate.toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatIntegerValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.round(value))
  }

  const parsedValue = Number.parseFloat(value)

  return Number.isFinite(parsedValue) ? String(Math.round(parsedValue)) : (value ?? '')
}

function parseDateString(dateString) {
  if (typeof dateString !== 'string') {
    return null
  }

  const trimmedDateString = dateString.trim()
  let normalizedDateString = null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDateString)) {
    normalizedDateString = trimmedDateString
  } else if (/^\d{8}$/.test(trimmedDateString)) {
    normalizedDateString = `${trimmedDateString.slice(0, 4)}-${trimmedDateString.slice(4, 6)}-${trimmedDateString.slice(6, 8)}`
  } else {
    return null
  }

  const parsedDate = new Date(`${normalizedDateString}T00:00:00`)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export function normalizeB120ForecastUpdateDate(dateString) {
  const parsedDate = parseDateString(dateString)

  if (!parsedDate) {
    return null
  }

  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getFirstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getLastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function buildForecastDateRange(updateDate) {
  const parsedUpdateDate = parseDateString(updateDate)

  if (!parsedUpdateDate) {
    return null
  }

  const startDate = getFirstDayOfMonth(parsedUpdateDate)
  const endDate = getLastDayOfMonth(new Date(startDate.getFullYear(), startDate.getMonth() + 5, 1))

  return {
    startDate: formatCompactDate(startDate),
    updateDate: formatCompactDate(parsedUpdateDate),
    endDate: formatCompactDate(endDate),
  }
}

function buildB120MonthlyNrtUrl() {
  return ({ stationId }) =>
    `https://cw3e.ucsd.edu/hydro/b120/csv/basins/nrt/combined/${stationId}_monthly.csv`
}

function buildB120DailyNrtUrl() {
  return ({ stationId }) =>
    `https://cw3e.ucsd.edu/hydro/b120/csv/basins/nrt/combined/${stationId}_daily.csv`
}

function buildB120RetroMonthlyNrtUrl() {
  return ({ stationId }) =>
    `https://cw3e.ucsd.edu/hydro/b120/csv/basins/retro/combined/${stationId}_monthly.csv`
}

function buildB120RetroDailyNrtUrl() {
  return ({ stationId }) =>
    `https://cw3e.ucsd.edu/hydro/b120/csv/basins/retro/combined/${stationId}_daily.csv`
}

function buildB120FcstUrl() {
  return ({ stationId, popupState }) => {
    const dateRange = buildForecastDateRange(
      popupState?.forecastUpdateDate ?? DEFAULT_B120_POINT_FORECAST_UPDATE_DATE,
    )
    const postProcessing =
      popupState?.forecastPostProcessing ?? DEFAULT_B120_POINT_POST_PROCESSING

    if (!dateRange) {
      return null
    }

    return `https://cw3e.ucsd.edu/hydro/b120/csv/basins/fcst/init${dateRange.startDate}_update${dateRange.updateDate}/${postProcessing}/${stationId}_${dateRange.startDate}-${dateRange.endDate}.csv`
  }
}

function buildB120DailyFcstUrl() {
  return ({ stationId, popupState }) => {
    const dateRange = buildForecastDateRange(
      popupState?.forecastUpdateDate ?? DEFAULT_B120_POINT_FORECAST_UPDATE_DATE,
    )

    if (!dateRange) {
      return null
    }

    return `https://cw3e.ucsd.edu/hydro/b120/csv/basins/fcst/init${dateRange.startDate}_update${dateRange.updateDate}/simulated/${stationId}_${dateRange.startDate}-${dateRange.endDate}_daily.csv`
  }
}

function buildB120RetroMonthlyLstmUrl() {
  return ({ stationId }) =>
    `https://cw3e.ucsd.edu/hydro/b120/csv/basins/retro/lstm_cdfm/${stationId}_monthly.csv`
}

export const B120_POINT_FORECAST_MAP_STATION_IDS = [
  'TNL', 'SBB', 'SIS', 'SDT', 'MSS', 'PSH', 'FTO', 'YRS',
  'AMF', 'CSN', 'MKM', 'SNS', 'TLG', 'MRC', 'SJF', 'KGF',
  'KWT', 'SCC', 'KRI', 'TRF', 'WFC', 'EFC', 'WWR', 'EWR',
]
export const B120_BASINS_GEOJSON_URL = 'https://cw3e.ucsd.edu/hydro/b120/csv/b120_basins_24.geojson'
export const B120_PAV50_PUOR_COLORSCALE = [
  [0.0, 'rgb(127, 59, 8)'],
  [0.04, 'rgb(148, 71, 7)'],
  [0.08, 'rgb(169, 82, 6)'],
  [0.12, 'rgb(188, 96, 9)'],
  [0.16, 'rgb(206, 113, 14)'],
  [0.2, 'rgb(224, 130, 20)'],
  [0.24, 'rgb(236, 152, 52)'],
  [0.28, 'rgb(247, 173, 83)'],
  [0.32, 'rgb(253, 192, 116)'],
  [0.36, 'rgb(254, 208, 149)'],
  [0.4, 'rgb(254, 224, 182)'],
  [0.44, 'rgb(251, 233, 208)'],
  [0.48, 'rgb(248, 242, 234)'],
  [0.52, 'rgb(241, 241, 245)'],
  [0.56, 'rgb(228, 230, 240)'],
  [0.6, 'rgb(216, 218, 235)'],
  [0.64, 'rgb(201, 199, 225)'],
  [0.68, 'rgb(186, 180, 215)'],
  [0.72, 'rgb(168, 160, 202)'],
  [0.76, 'rgb(148, 137, 187)'],
  [0.8, 'rgb(128, 115, 172)'],
  [0.84, 'rgb(110, 85, 158)'],
  [0.88, 'rgb(93, 54, 143)'],
  [0.92, 'rgb(76, 31, 124)'],
  [0.96, 'rgb(61, 16, 99)'],
  [1.0, 'rgb(45, 0, 75)'],
]

function buildEnsembleSeries(start = 1, end = 46) {
  return Object.fromEntries(
    Array.from({ length: end - start + 1 }, (_, index) => {
      const memberNumber = start + index
      const memberId = String(memberNumber).padStart(2, '0')
      const column = `Ens${memberId}`

      return [
        `Ens${memberId}`,
        {
          sourceId: 'fcst',
          column,
          line: { color: '#d3d3d3', width: 1 },
          yAxis: 'y',
          showlegend: false,
        },
      ]
    }),
  )
}

export const B120_POINT_POPUP_WIDTH = STATION_POPUP_WIDTH
export const B120_POINT_FORECAST_UPDATES_URL =
  'https://cw3e.ucsd.edu/hydro/b120/csv/fcst_tupdates.json'
export const B120_POINT_FORECAST_UPDATE_OPTIONS = [
  '2026-04-01',
  '2026-04-07',
  '2026-04-14',
]
export const DEFAULT_B120_POINT_FORECAST_UPDATE_DATE =
  B120_POINT_FORECAST_UPDATE_OPTIONS[B120_POINT_FORECAST_UPDATE_OPTIONS.length - 1]
export const B120_POINT_POST_PROCESSING_OPTIONS = [
  { id: 'cdfm', label: 'CDF Match' },
  { id: 'lstm_cdfm', label: 'LSTM' },
]
export const DEFAULT_B120_POINT_POST_PROCESSING = B120_POINT_POST_PROCESSING_OPTIONS[0].id

export function getB120PointPostProcessingLabel(postProcessingId) {
  return (
    B120_POINT_POST_PROCESSING_OPTIONS.find((option) => option.id === postProcessingId)?.label ??
    B120_POINT_POST_PROCESSING_OPTIONS[0].label
  )
}

export function doesB120PointTabUsePostProcessing(tabId) {
  return tabId === 'nrt-fcst' || tabId === 'forecast-summary' || tabId === 'map'
}

export function doesB120PointTabUseForecastUpdate(tabId) {
  return tabId === 'nrt-fcst' || tabId === 'nrt-fcst-daily' || tabId === 'forecast-summary' || tabId === 'map'
}

export const B120_POINT_POPUP_TABS = [
  {
    id: 'nrt-fcst',
    label: 'NRT/Forecast',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'nrt',
            buildUrl: buildB120MonthlyNrtUrl(),
            transformRows: ({ rows }) => rows.slice(0, -1),
          },
          {
            id: 'fcst',
            buildUrl: buildB120FcstUrl(),
            transformRows: ({ rows }) => rows.slice(0, -1),
          },
        ],
        hovermode: 'x unified',
        titleTemplate: 'Station ID: {stationId}, Basin: {basin}, Location: {location}<br />Post-Processing: {postProcessing}, Forecast Update: {updateDate}',
        layout: {
          ...DEFAULT_TIMESERIES_LAYOUT,
          margin: {
            ...DEFAULT_TIMESERIES_LAYOUT.margin,
            t: 38,
          },
        },
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        axes: {
          y: {
            title: { text: 'Monthly Flow (taf)', standoff: 0 },
          },
        },
        series: {
          ...buildEnsembleSeries(),
          simulated: {
            sourceId: 'nrt',
            column: 'Qsim',
            label: 'Model-simulated',
            line: { color: 'blue', width: 1 },
            yAxis: 'y',
          },
          matched: {
            sourceId: 'nrt',
            column: 'Qmatch',
            label: 'CDF-matched',
            line: { color: 'red', width: 1 },
            yAxis: 'y',
          },
          fnf: {
            sourceId: 'nrt',
            column: 'FNF',
            label: 'FNF',
            mode: 'markers',
            marker: {
              symbol: 'square',
              size: 8,
              color: 'black',
              line: { width: 0 } // optional (no outline)
            },
            yAxis: 'y',
          },
          avg: {
            sourceId: 'fcst',
            column: 'Avg',
            label: 'Historical Average',
            line: { color: 'black', width: 2, dash: 'dash' },
            yAxis: 'y',
          },
          exc50: {
            sourceId: 'fcst',
            column: 'Exc50',
            label: '50% Exceedance',
            mode: 'markers+lines',
            marker: {
              symbol: 'circle',
              size: 5,
              color: 'green',
              line: { width: 0 } // optional (no outline)
            },
            line: { color: 'green', width: 2 },
            yAxis: 'y',
          },
          exc90: {
            sourceId: 'fcst',
            column: 'Exc90',
            label: '90% Exceedance',
            mode: 'markers+lines',
            marker: {
              symbol: 'circle',
              size: 5,
              color: 'orange',
              line: { width: 0 } // optional (no outline)
            },
            line: { color: 'orange', width: 2 },
            yAxis: 'y',
          },
          exc10: {
            sourceId: 'fcst',
            column: 'Exc10',
            label: '10% Exceedance',
            mode: 'markers+lines',
            marker: {
              symbol: 'circle',
              size: 5,
              color: 'purple',
              line: { width: 0 } // optional (no outline)
            },
            line: { color: 'purple', width: 2 },
            yAxis: 'y',
          },
        },
      },
    ],
  },
  {
    id: 'nrt-fcst-daily',
    label: 'NRT/Forecast (Daily)',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'nrt',
            buildUrl: buildB120DailyNrtUrl(),
            transformRows: ({ rows }) => rows.slice(0, -1),
          },
          {
            id: 'fcst',
            buildUrl: buildB120DailyFcstUrl(),
            transformRows: ({ rows }) => rows.slice(0, -1),
          },
        ],
        hovermode: 'x unified',
        titleTemplate: 'Station ID: {stationId}, Basin: {basin}, Location: {location}<br />Post-Processing: None, Forecast Update: {updateDate}',
        layout: {
          ...DEFAULT_TIMESERIES_LAYOUT,
          margin: {
            ...DEFAULT_TIMESERIES_LAYOUT.margin,
            t: 38,
          },
        },
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        axes: {
          y: {
            title: { text: 'Daily Flow', standoff: 0 },
          },
        },
        series: {
          ...buildEnsembleSeries(),
          simulated: {
            sourceId: 'nrt',
            column: 'Qsim',
            label: 'Model-simulated',
            line: { color: 'blue', width: 1 },
            yAxis: 'y',
          },
          fnf: {
            sourceId: 'nrt',
            column: 'FNF',
            label: 'FNF',
            line: { color: 'black', width: 1 },
            yAxis: 'y',
          },
          exc50: {
            sourceId: 'fcst',
            column: 'Exc50',
            label: '50% Exceedance',
            line: { color: 'green', width: 2 },
            yAxis: 'y',
          },
          exc90: {
            sourceId: 'fcst',
            column: 'Exc90',
            label: '90% Exceedance',
            line: { color: 'orange', width: 2 },
            yAxis: 'y',
          },
          exc10: {
            sourceId: 'fcst',
            column: 'Exc10',
            label: '10% Exceedance',
            line: { color: 'purple', width: 2 },
            yAxis: 'y',
          },
        },
      },
    ],
  },
  {
    id: 'retrospective',
    label: 'Retrospective',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'retro',
            buildUrl: buildB120RetroMonthlyNrtUrl(),
            transformRows: ({ rows }) => rows.slice(0, -1),
          },
          {
            id: 'lstm',
            buildUrl: buildB120RetroMonthlyLstmUrl(),
            transformRows: ({ rows }) => rows.slice(0, -1),
          },
        ],
        hovermode: 'x unified',
        titleTemplate: 'Station ID: {stationId}, Basin: {basin}, Location: {location}',
        layout: {
          ...DEFAULT_TIMESERIES_LAYOUT,
          margin: {
            ...DEFAULT_TIMESERIES_LAYOUT.margin,
            t: 30,
          },
        },
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        axes: {
          y: {
            title: { text: 'Monthly Flow (taf)', standoff: 0 },
          },
        },
        series: {
          simulated: {
            sourceId: 'retro',
            column: 'Qsim',
            label: 'Model-simulated',
            line: { color: 'blue', width: 1 },
            yAxis: 'y',
          },
          matched: {
            sourceId: 'retro',
            column: 'Qmatch',
            label: 'CDF-matched',
            line: { color: 'red', width: 1 },
            yAxis: 'y',
          },
          lstm: {
            sourceId: 'lstm',
            column: 'Qmatch',
            label: 'LSTM',
            line: { color: 'magenta', width: 1 },
            yAxis: 'y',
          },
          fnf: {
            sourceId: 'retro',
            column: 'FNF',
            label: 'FNF',
            mode: 'markers+lines',
            marker: {
              symbol: 'square',
              size: 3,
              color: 'black',
              line: { width: 0 },
            },
            line: { color: 'black', width: 1 },
            yAxis: 'y',
          },
        },
      },
    ],
  },
  {
    id: 'retrospective-daily',
    label: 'Retrospective (Daily)',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'retro',
            buildUrl: buildB120RetroDailyNrtUrl(),
            transformRows: ({ rows }) => rows.slice(0, -1),
          },
        ],
        hovermode: 'x unified',
        titleTemplate: 'Station ID: {stationId}, Basin: {basin}, Location: {location}',
        layout: {
          ...DEFAULT_TIMESERIES_LAYOUT,
          margin: {
            ...DEFAULT_TIMESERIES_LAYOUT.margin,
            t: 30,
          },
        },
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        axes: {
          y: {
            title: { text: 'Daily Flow', standoff: 0 },
          },
        },
        series: {
          simulated: {
            sourceId: 'retro',
            column: 'Qsim',
            label: 'Model-simulated',
            line: { color: 'blue', width: 1 },
            yAxis: 'y',
          },
          fnf: {
            sourceId: 'retro',
            column: 'FNF',
            label: 'FNF',
            line: { color: 'black', width: 1 },
            yAxis: 'y',
          },
        },
      },
    ],
  },
  {
    id: 'forecast-summary',
    label: 'Forecast Table',
    plots: [
      {
        id: 'main',
        type: 'table',
        sourceId: 'fcst',
        sources: [
          {
            id: 'fcst',
            buildUrl: buildB120FcstUrl(),
            transformRows: ({ rows }) =>
              rows.map((row, index) => ({
                ...row,
                Date:
                  index === rows.length - 1
                    ? 'Apr-Jul'
                    : formatMonthYearLabel(row?.Date),
              })),
          },
        ],
        titleTemplate: 'Station ID: {stationId}, Basin: {basin}, Location: {location}<br />Post-Processing: {postProcessing}, Forecast Update: {updateDate}',
        layout: {
          ...DEFAULT_TIMESERIES_LAYOUT,
          margin: {
            ...DEFAULT_TIMESERIES_LAYOUT.margin,
            t: 38,
          },
        },
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        footerText: '[Note] 50%, 90%, 10%: exceedance levels within the forecast ensemble, calculated in two units: (1) %Avg: percentage of Avg, (2) taf: thousand-acre-feet.<br>Avg: month of year average during 1979-2024.',
        columns: [
          {
            key: 'Date',
            label: 'Date',
          },
          {
            key: 'Exc50',
            label: '50% (taf)',
            format: formatIntegerValue,
          },
          {
            key: 'Pav50',
            label: '50% (%Avg)',
            format: formatIntegerValue,
          },
          {
            key: 'Exc90',
            label: '90% (taf)',
            format: formatIntegerValue,
          },
          {
            key: 'Pav90',
            label: '90% (%Avg)',
            format: formatIntegerValue,
          },
          {
            key: 'Exc10',
            label: '10% (taf)',
            format: formatIntegerValue,
          },
          {
            key: 'Pav10',
            label: '10% (%Avg)',
            format: formatIntegerValue,
          },
          {
            key: 'Avg',
            label: 'Avg (taf)',
            format: formatIntegerValue,
          },
        ],
      },
    ],
  },
  {
    id: 'map',
    label: 'Summary Map',
    plots: [
      {
        id: 'pav50-map',
        type: 'choroplethmap',
        plotHeight: 400,
        titleTemplate: 'Median Apr-to-Jul Forecast as % of Historical Average<br />Post-Processing: {postProcessing}, Forecast Update: {updateDate}',
        layout: {
          margin: {
            l: 0,
            r: 0,
            t: 38,
            b: 0,
          },
        },
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        basinGeoJsonUrl: B120_BASINS_GEOJSON_URL,
        stationIds: B120_POINT_FORECAST_MAP_STATION_IDS,
        buildStationUrl: buildB120FcstUrl(),
        valueKey: 'Pav50',
        valueLabel: '50% (%Avg)',
        colorbarTitle: '% of Historical Average',
        colorscale: B120_PAV50_PUOR_COLORSCALE,
        zmin: 0,
        zmax: 200,
      },
      {
        id: 'exc50-map',
        type: 'choroplethmap',
        plotHeight: 400,
        titleTemplate: 'Median Apr-to-Jul Forecast in taf<br />Post-Processing: {postProcessing}, Forecast Update: {updateDate}',
        layout: {
          margin: {
            l: 0,
            r: 0,
            t: 38,
            b: 0,
          },
        },
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        basinGeoJsonUrl: B120_BASINS_GEOJSON_URL,
        stationIds: B120_POINT_FORECAST_MAP_STATION_IDS,
        buildStationUrl: buildB120FcstUrl(),
        valueKey: 'Exc50',
        valueLabel: '50% (taf)',
        colorbarTitle: 'taf',
        colorscale: 'Viridis',
        reversescale: true,
      },
    ],
  },
]

export function getB120PointPopupTabDefinition(tabId) {
  return B120_POINT_POPUP_TABS.find((tab) => tab.id === tabId) ?? null
}

export function getDefaultB120PointPopupTabId() {
  return B120_POINT_POPUP_TABS[0]?.id ?? 'nrt-forecast'
}

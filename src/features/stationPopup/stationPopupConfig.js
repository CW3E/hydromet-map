const buildStationCsvUrl = (product, timestep) => ({ stationId, popupState }) => {
  if (product === 'fcst') {
    const forecastProductPath = getStationPopupForecastProductPath(popupState?.forecastProduct)
    return `https://cw3e.ucsd.edu/hydro/cnrfc/csv/basins/fcst/${forecastProductPath}/${timestep}/${stationId}_${timestep}.csv.gz`
  }

  return `https://cw3e.ucsd.edu/hydro/cnrfc/csv/basins/${product}/${timestep}/${stationId}_${timestep}.csv.gz`
}

export const STATION_POPUP_WIDTH = '1100px'
export const STATION_POPUP_FORECAST_PRODUCTS = [
  { id: 'wwrf-ecmwf', label: 'WWRF-ECMWF', path: 'wwrf_ecmwf' },
  { id: 'wwrf-gfs', label: 'WWRF-GFS', path: 'wwrf_gfs' },
  { id: 'gfs', label: 'GFS', path: 'gfs' },
]
export const DEFAULT_STATION_POPUP_FORECAST_PRODUCT = STATION_POPUP_FORECAST_PRODUCTS[0].id

export function getStationPopupForecastProductPath(productId) {
  return (
    STATION_POPUP_FORECAST_PRODUCTS.find((product) => product.id === productId)?.path ??
    STATION_POPUP_FORECAST_PRODUCTS[0].path
  )
}

export function getStationPopupForecastProductLabel(productId) {
  return (
    STATION_POPUP_FORECAST_PRODUCTS.find((product) => product.id === productId)?.label ??
    STATION_POPUP_FORECAST_PRODUCTS[0].label
  )
}

function parsePopupStatusTimestamp(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return null
  }

  const normalizedValue = rawValue.trim()
  const parsedValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedValue)
    ? new Date(`${normalizedValue}:00`)
    : new Date(normalizedValue)

  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue
}

function shiftDate(date, { years = 0, months = 0, days = 0 }) {
  const nextDate = new Date(date)

  if (years !== 0) {
    nextDate.setFullYear(nextDate.getFullYear() + years)
  }

  if (months !== 0) {
    nextDate.setMonth(nextDate.getMonth() + months)
  }

  if (days !== 0) {
    nextDate.setDate(nextDate.getDate() + days)
  }

  return nextDate
}

function formatRangeDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatRangeDateTime(date) {
  const datePart = formatRangeDate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${datePart} ${hours}:${minutes}`
}

function buildRelativeTimeAxis({
  popupState,
  startShift,
  endShift,
  mode = 'datetime',
}) {
  const statusTimestamp = parsePopupStatusTimestamp(popupState?.statusTimestamp)

  if (!statusTimestamp) {
    return {}
  }

  const rangeStart = shiftDate(statusTimestamp, startShift)
  const rangeEnd = shiftDate(statusTimestamp, endShift)

  return {
    range: mode === 'date'
      ? [formatRangeDate(rangeStart), formatRangeDate(rangeEnd)]
      : [formatRangeDateTime(rangeStart), formatRangeDateTime(rangeEnd)],
  }
}

export const DEFAULT_TIMESERIES_LAYOUT = {
  autosize: true,
  margin: {
    l: 5,
    r: 5,
    t: 20,
    b: 5,
  },
  showlegend: true,
  legend: {
    orientation: 'v',
    x: 0.01,
    xanchor: 'left',
    y: 0.97,
    yanchor: 'top',
    bgcolor: 'rgba(255,255,255,0.72)',
    bordercolor: 'rgba(16,34,47,0.12)',
    borderwidth: 1,
    font: {
      size: 11,
    },
  },
}

export const DEFAULT_TIMESERIES_PLOTLY_CONFIG = {
  displayModeBar: 'hover',
  responsive: true,
}

const DEFAULT_TIMESERIES_TITLE_TEMPLATE = 'WRF-Hydro (NWM v3.0) + {forecastProduct}, {stationName} ({stationId})'

export const STATION_POPUP_TABS = [
  {
    id: 'hourly',
    label: 'Hourly',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'nrt',
            buildUrl: buildStationCsvUrl('nrt', 'hourly'),
          },
          {
            id: 'fcst',
            buildUrl: buildStationCsvUrl('fcst', 'hourly'),
          },
        ],
        hovermode: 'x unified',
        titleTemplate: DEFAULT_TIMESERIES_TITLE_TEMPLATE,
        layout: DEFAULT_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        xAxis: ({ popupState }) =>
          buildRelativeTimeAxis({
            popupState,
            startShift: { months: -6 },
            endShift: { days: 20 },
            mode: 'datetime',
          }),
        axes: {
          y: {
            title: { text: 'Temperature (°C)', font: { color: 'orange' }, standoff: 0 },
            tickfont: { color: 'orange' },
            zeroline: false,
          },
          y2: {
            title: { text: 'Precipitation (mm)', font: { color: '#B7CEEC' }, standoff: 0 },
            tickfont: { color: '#B7CEEC' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'right',
            showgrid: false,
          },
          y3: {
            title: { text: 'Local Runoff (m³/s)', font: { color: 'blue' }, standoff: 0 },
            tickfont: { color: 'blue' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'right',
            showgrid: false,
          },
        },
        series: {
          qBucketNrt: {
            sourceId: 'nrt',
            column: 'qBucket',
            visible: false,
          },
          qSfcLatRunoffNrt: {
            sourceId: 'nrt',
            column: 'qSfcLatRunoff',
            visible: false,
          },
          t2dNrt: {
            sourceId: 'nrt',
            column: 'T2D',
            label: 'T (°C)',
            line: { color: 'orange', width: 1 },
            yAxis: 'y',
          },
          precNrt: {
            sourceId: 'nrt',
            column: 'PREC',
            label: 'P (mm)',
            type: 'bar',
            marker: { color: '#B7CEEC' },
            yAxis: 'y2',
          },
          runoffNrt: {
            sourceId: 'nrt',
            column: 'RUNOFF',
            label: 'Local Q (m³/s)',
            line: { color: 'blue', width: 1 },
            yAxis: 'y3',
          },
          qBucketFcst: {
            sourceId: 'fcst',
            column: 'qBucket',
            visible: false,
          },
          qSfcLatRunoff: {
            sourceId: 'fcst',
            column: 'qSfcLatRunoff',
            visible: false,
          },
          t2dFcst: {
            sourceId: 'fcst',
            column: 'T2D',
            label: 'Fcst T (°C)',
            line: { color: 'orange', width: 1, dash: 'dash' },
            yAxis: 'y',
          },
          precFcst: {
            sourceId: 'fcst',
            column: 'PREC',
            label: 'Fcst P (mm)',
            type: 'bar',
            marker: { color: '#B7CEEC', pattern: { shape: '/', bgcolor: 'white', fgcolor: 'darkgray', fillmode: 'replace' } },
            yAxis: 'y2',
          },
          runOffFcst: {
            sourceId: 'fcst',
            column: 'RUNOFF',
            label: 'Fcst Local Q (m³/s)',
            line: { color: 'blue', width: 1, dash: 'dash' },
            yAxis: 'y3',
          },
        },
      },
    ],
  },
  {
    id: 'daily',
    label: 'Daily',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'nrt',
            buildUrl: buildStationCsvUrl('nrt', 'daily'),
          },
          {
            id: 'fcst',
            buildUrl: buildStationCsvUrl('fcst', 'daily'),
          },
        ],
        hovermode: 'x unified',
        titleTemplate: DEFAULT_TIMESERIES_TITLE_TEMPLATE,
        layout: DEFAULT_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        xAxis: ({ popupState }) =>
          buildRelativeTimeAxis({
            popupState,
            startShift: { months: -12 },
            endShift: { days: 30 },
            mode: 'date',
          }),
        axes: {
          y: {
            title: { text: 'Temperature (°C)', font: { color: 'orange' }, standoff: 0 },
            tickfont: { color: 'orange' },
            zeroline: false,
          },
          y2: {
            title: { text: 'Precipitation (mm)', font: { color: '#B7CEEC' }, standoff: 0 },
            tickfont: { color: '#B7CEEC' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'right',
            showgrid: false,
          },
          y3: {
            title: { text: 'Local Runoff (m³/s)', font: { color: 'blue' }, standoff: 0 },
            tickfont: { color: 'blue' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'right',
            showgrid: false,
          },
          y4: {
            title: { text: 'Snow Water Equivalent (mm)', font: { color: 'magenta' }, standoff: 0 },
            tickfont: { color: 'magenta' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'left',
            showgrid: false,
          },
          y5: {
            title: { text: 'Soil Moisture (mm)', font: { color: 'green' }, standoff: 0 },
            tickfont: { color: 'green' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'left',
            showgrid: false,
          },
        },
        series: {
          t2dNrt: {
            sourceId: 'nrt',
            column: 'T2D',
            label: 'T (°C)',
            line: { color: 'orange', width: 1 },
            yAxis: 'y',
          },
          precNrt: {
            sourceId: 'nrt',
            column: 'PREC',
            label: 'P (mm)',
            type: 'bar',
            marker: { color: '#B7CEEC' },
            yAxis: 'y2',
          },
          runoffNrt: {
            sourceId: 'nrt',
            column: 'RUNOFF',
            label: 'Local Q (m³/s)',
            line: { color: 'blue', width: 1 },
            yAxis: 'y3',
          },
          sweNrt: {
            sourceId: 'nrt',
            column: 'SWE',
            label: 'SWE (mm)',
            line: { color: 'magenta', width: 1 },
            yAxis: 'y4',
          },
          smTotNrt: {
            sourceId: 'nrt',
            column: 'SMTOT',
            label: 'SM (mm)',
            line: { color: 'green', width: 1 },
            yAxis: 'y5',
            scaleFactor: 1000,
            offset: 0,
          },
          t2dFcst: {
            sourceId: 'fcst',
            column: 'T2D',
            label: 'FcstT (°C)',
            line: { color: 'orange', width: 1, dash: 'dash' },
            yAxis: 'y',
          },
          precFcst: {
            sourceId: 'fcst',
            column: 'PREC',
            label: 'FcstP (mm)',
            type: 'bar',
            marker: { color: '#B7CEEC', pattern: { shape: '/', bgcolor: 'white', fgcolor: 'darkgray', fillmode: 'replace' } },
            yAxis: 'y2',
          },
          runoffFcst: {
            sourceId: 'fcst',
            column: 'RUNOFF',
            label: 'Fcst Local Q (m³/s)',
            line: { color: 'blue', width: 1, dash: 'dash' },
            yAxis: 'y3',
          },
          sweFcst: {
            sourceId: 'fcst',
            column: 'SWE',
            label: 'Fcst SWE (mm)',
            line: { color: 'magenta', width: 1, dash: 'dash' },
            yAxis: 'y4',
          },
          smTotFcst: {
            sourceId: 'fcst',
            column: 'SMTOT',
            label: 'Fcst SM (mm)',
            line: { color: 'green', width: 1, dash: 'dash' },
            yAxis: 'y5',
            scaleFactor: 1000,
            offset: 0,
          },
        },
      },
    ],
  },
  {
    id: 'monthly',
    label: 'Monthly',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'nrt',
            buildUrl: buildStationCsvUrl('nrt', 'monthly'),
          },
        ],
        hovermode: 'x unified',
        titleTemplate: DEFAULT_TIMESERIES_TITLE_TEMPLATE,
        layout: DEFAULT_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        xAxis: ({ popupState }) =>
          buildRelativeTimeAxis({
            popupState,
            startShift: { years: -10 },
            endShift: { months: 1 },
            mode: 'date',
          }),
        axes: {
          y: {
            title: { text: 'Temperature (°C)', font: { color: 'orange' }, standoff: 0 },
            tickfont: { color: 'orange' },
            zeroline: false,
          },
          y2: {
            title: { text: 'Precipitation (mm)', font: { color: '#B7CEEC' }, standoff: 0 },
            tickfont: { color: '#B7CEEC' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'right',
            showgrid: false,
          },
          y3: {
            title: { text: 'Local Runoff (m³/s)', font: { color: 'blue' }, standoff: 0 },
            tickfont: { color: 'blue' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'right',
            showgrid: false,
          },
          y4: {
            title: { text: 'Snow Water Equivalent (mm)', font: { color: 'magenta' }, standoff: 0 },
            tickfont: { color: 'magenta' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'left',
            showgrid: false,
          },
          y5: {
            title: { text: 'Soil Moisture (mm)', font: { color: 'green' }, standoff: 0 },
            tickfont: { color: 'green' },
            zeroline: false,
            range: [0, null],
            overlaying: 'y',
            side: 'left',
            showgrid: false,
          },
        },
        series: {
          T2D: {
            sourceId: 'nrt',
            column: 'T2D',
            label: 'T (°C)',
            line: { color: 'orange', width: 1 },
            yAxis: 'y',
          },
          PREC: {
            sourceId: 'nrt',
            column: 'PREC',
            label: 'P (mm)',
            type: 'bar',
            marker: { color: '#B7CEEC' },
            yAxis: 'y2',
          },
          RUNOFF: {
            sourceId: 'nrt',
            column: 'RUNOFF',
            label: 'Local Q (m³/s)',
            line: { color: 'blue', width: 1 },
            yAxis: 'y3',
          },
          SWE: {
            sourceId: 'nrt',
            column: 'SWE',
            label: 'SWE (mm)',
            line: { color: 'magenta', width: 1 },
            yAxis: 'y4',
          },
          SMTOT: {
            sourceId: 'nrt',
            column: 'SMTOT',
            label: 'SM (mm)',
            line: { color: 'green', width: 1 },
            yAxis: 'y5',
            scaleFactor: 1000,
            offset: 0,
          },
        },
      },
    ],
  },
]

export function getStationPopupTabDefinition(tabId) {
  return STATION_POPUP_TABS.find((tab) => tab.id === tabId) ?? null
}

export function getDefaultStationPopupTabId() {
  return STATION_POPUP_TABS[1]?.id ?? STATION_POPUP_TABS[0]?.id ?? 'daily'
}

import {
  DEFAULT_TIMESERIES_LAYOUT,
  DEFAULT_TIMESERIES_PLOTLY_CONFIG,
  TIMESERIES_POPUP_WIDTH,
} from '../cnrfcPointPopup/cnrfcPointPopupConfig'

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

function buildRelativeTimeAxis({
  popupState,
  startShift,
  endShift,
}) {
  const statusTimestamp = parsePopupStatusTimestamp(popupState?.statusTimestamp)

  if (!statusTimestamp) {
    return {}
  }

  const rangeStart = shiftDate(statusTimestamp, startShift)
  const rangeEnd = shiftDate(statusTimestamp, endShift)

  return {
    range: [formatRangeDate(rangeStart), formatRangeDate(rangeEnd)],
  }
}

function buildSnowNrtXAxis({ popupState, observationNetwork }) {
  if (observationNetwork === 'Snow Courses') {
    return buildRelativeTimeAxis({
      popupState,
      startShift: { months: -10 },
      endShift: { months: 4 },
    })
  }

  return buildRelativeTimeAxis({
    popupState,
    startShift: { months: -10 },
    endShift: { months: 4 },
  })
}

function buildSnowModelCsvUrl(product) {
  return ({ stationId }) => `https://cw3e.ucsd.edu/hydro/b120/csv/basins/${product}/sites/${stationId}.csv`
}

function buildSnowObservationCsvUrl(observationPath) {
  return ({ stationId }) =>
    `https://cw3e.ucsd.edu/hydro/b120/csv/basins/obs/${observationPath.replace('{stationId}', stationId)}.csv`
}

function buildSnowStatsCsvUrl(statsPath) {
  return ({ stationId }) =>
    `https://cw3e.ucsd.edu/hydro/b120/csv/basins/obs/${statsPath.replace('{stationId}', stationId)}.csv`
}

function parseMonthDay(monthDay) {
  if (typeof monthDay !== 'string') {
    return null
  }

  const trimmedMonthDay = monthDay.trim()

  if (!trimmedMonthDay) {
    return null
  }

  const match = trimmedMonthDay.match(/^(\d{1,2})[-/](\d{1,2})$/)

  if (!match) {
    return null
  }

  const month = Number.parseInt(match[1], 10)
  const day = Number.parseInt(match[2], 10)

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  return { month, day }
}

function getWaterYear(date) {
  return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear()
}

function formatWaterYearDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function toTitleCaseLabel(value) {
  return String(value)
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function attachWaterYearDates(rows, popupState) {
  const statusTimestamp = parsePopupStatusTimestamp(popupState?.statusTimestamp)

  if (!statusTimestamp) {
    return rows
  }

  const waterYear = getWaterYear(statusTimestamp)

  return rows.map((row) => {
    const parsedMonthDay = parseMonthDay(row?.month_day)

    if (!parsedMonthDay) {
      return row
    }

    const calendarYear = parsedMonthDay.month >= 10 ? waterYear - 1 : waterYear

    return {
      ...row,
      date: formatWaterYearDate(calendarYear, parsedMonthDay.month, parsedMonthDay.day),
    }
  })
}

function buildStatsSeries(sourceRecords) {
  const statsSource = sourceRecords.stats

  if (!statsSource) {
    return {}
  }

  const excludedFields = new Set(['month_day', 'date', 'wy_day'])
  const statsLineColors = [
    'mediumslateblue',
    'lightcyan',
    'lightgreen',
    'green',
    'lightyellow',
    'lightpink',
    'lightpink',
  ]

  const statsFillColors = [
    'mediumslateblue',
    'lightcyan',
    'lightgreen',
    'green',
    'lightyellow',
    'lightpink',
    'white',
  ]

  const numericFields = statsSource.fields.filter((field) => {
    if (excludedFields.has(field)) {
      return false
    }

    return statsSource.rows.some((row) => {
      const value = row?.[field]
      return typeof value === 'number' && Number.isFinite(value)
    })
  }).reverse()

  function formatStatsLabel(field) {
    const percentileMatch = /^p(\d+)$/i.exec(field)

    if (!percentileMatch) {
      return toTitleCaseLabel(field)
    }

    const percentileValue = Number.parseInt(percentileMatch[1], 10)

    if (!Number.isFinite(percentileValue)) {
      return toTitleCaseLabel(field)
    }

    const remainder100 = percentileValue % 100
    const remainder10 = percentileValue % 10
    let ordinalSuffix = 'th'

    if (remainder100 < 11 || remainder100 > 13) {
      if (remainder10 === 1) {
        ordinalSuffix = 'st'
      } else if (remainder10 === 2) {
        ordinalSuffix = 'nd'
      } else if (remainder10 === 3) {
        ordinalSuffix = 'rd'
      }
    }

    return `${percentileValue}<sup>${ordinalSuffix}</sup>`
  }

  return Object.fromEntries(
    numericFields.map((field, index) => [
      `stats${field}`,
      {
        sourceId: 'stats',
        column: field,
        label: formatStatsLabel(field),
        mode: 'lines',
        line: {
          color: statsLineColors[index % statsLineColors.length],
          width: 1,
        },
        fill: index === 3 ? 'none' : 'tozeroy',
        fillcolor: index === statsFillColors.length - 1
          ? `white`
          : `${statsFillColors[index % statsFillColors.length]}22`,
        yAxis: 'y',
      },
    ]),
  )
}

function createSinglePlotTab({
  id,
  label,
  modelProduct,
  observationPath,
  statsPath,
  titleTemplate,
  observationNetwork,
}) {
  const isNrtTab = id === 'nrt'
  const extraSources = isNrtTab && statsPath
    ? [
        {
          id: 'stats',
          buildUrl: buildSnowStatsCsvUrl(statsPath),
          transformRows: ({ rows, popupState }) => attachWaterYearDates(rows, popupState),
        },
      ]
    : []

  return {
    id,
    label,
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'model',
            buildUrl: buildSnowModelCsvUrl(modelProduct),
          },
          {
            id: 'obs',
            buildUrl: buildSnowObservationCsvUrl(observationPath),
          },
          ...extraSources,
        ],
        hovermode: 'x unified',
        titleTemplate,
        layout: DEFAULT_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        xAxis: isNrtTab
          ? ({ popupState }) => buildSnowNrtXAxis({ popupState, observationNetwork })
          : undefined,
        buildSeries: ({ sourceRecords }) => buildStatsSeries(sourceRecords),
        axes: {
          y: {
            title: { text: 'Snow Water Equivalent (in)', standoff: 0 },
          },
        },
        series: {
          sweModel: {
            sourceId: 'model',
            column: 'SWE',
            label: 'Model-simulated',
            line: { color: 'magenta', width: 1.5 },
            yAxis: 'y',
            scaleFactor: 1/25.4, // Convert mm to inches
            offset: 0,
          },
          sweObs: {
            sourceId: 'obs',
            column: 'SWE',
            label: observationNetwork,
            mode: observationNetwork === 'Snow Courses' ? 'lines+markers' : 'lines',
            line: { color: 'black', width: 1.5 },
            marker: { symbol: 'circle', size: 4, color: 'black' },
            yAxis: 'y',
          },
        },
      },
    ],
  }
}

function createSnowPopupDefinition({
  popupType,
  observationNetwork,
  titleTemplate,
  observationPath,
  statsPath,
}) {
  return {
    popupType,
    popupWidth: TIMESERIES_POPUP_WIDTH,
    tabs: [
      createSinglePlotTab({
        id: 'nrt',
        label: 'NRT',
        modelProduct: 'nrt',
        observationPath,
        statsPath,
        titleTemplate,
        observationNetwork,
      }),
      createSinglePlotTab({
        id: 'retrospective',
        label: 'Retrospective',
        modelProduct: 'retro',
        observationPath,
        titleTemplate,
        observationNetwork,
      }),
    ],
  }
}

export const SNOW_COURSES_POPUP_DEFINITION = createSnowPopupDefinition({
  popupType: 'snow-courses',
  observationNetwork: 'Snow Courses',
  titleTemplate: 'ID: {stationId}, Name:{stationName}, Elevation: {elevation} ft, Basin:{basinName}, Hydro Area: {hydroArea}',
  observationPath: 'snow_course/SWE_monthly_{stationId}',
})

export const SNOW_PILLOWS_POPUP_DEFINITION = createSnowPopupDefinition({
  popupType: 'snow-pillows',
  observationNetwork: 'Snow Pillows',
  titleTemplate: 'ID: {stationId}, Name:{stationName}, Elevation: {elevation} ft, Basin:{basinName}, Hydro Area: {hydroArea}',
  observationPath: 'snow_pillow/SWE_daily_{stationId}',
  statsPath: 'snow_pillow/stats/SWE_daily_{stationId}_stats',
})

export function getSnowPopupTabs(popupDefinition) {
  return popupDefinition?.tabs ?? []
}

export function getSnowPopupTabDefinition(popupDefinition, tabId) {
  return getSnowPopupTabs(popupDefinition).find((tab) => tab.id === tabId) ?? null
}

export function getDefaultSnowPopupTabId(popupDefinition) {
  return getSnowPopupTabs(popupDefinition)[0]?.id ?? 'nrt'
}

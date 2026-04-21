import {
  CLIMATOLOGY_COLUMN_NAMES,
  fetchGradesBinaryDescriptor,
} from '../../lib/gradesBinaryData'
import {
  DEFAULT_TIMESERIES_LAYOUT,
  DEFAULT_TIMESERIES_PLOTLY_CONFIG,
} from '../cnrfcPointPopup/cnrfcPointPopupConfig'

export const GLOBAL_REACH_POPUP_WIDTH = '1100px'

const RECENT_DAYS = 366
const CLIMATOLOGY_LINE_COLORS = [
  'mediumpurple', //'mediumslateblue',
  'lightblue', //'lightcyan',
  'lightcyan', //'lightgreen',
  'lightgreen', //'green',
  'yellow', //'lightyellow',
  'orange', //'lightpink',
  'sienna', //'lightpink',
]

const CLIMATOLOGY_FILL_COLORS = [
  'mediumpurple', //'mediumslateblue',
  'lightblue', //'lightcyan',
  'lightcyan', //'lightgreen',
  'lightgreen', //'green',
  'yellow', //'lightyellow',
  'orange', //'lightpink',
  'white', //'white',
]

const CLIMATOLOGY_SERIES_DEFINITIONS = {
  p95: {
    sourceId: 'climatology',
    column: 'Pctl7',
    label: '95<sup>th</sup>',
    line: { color: CLIMATOLOGY_LINE_COLORS[0], width: 1 },
    fill: 'tozeroy',
    fillcolor: `${CLIMATOLOGY_FILL_COLORS[0]}22`,
    yAxis: 'y',
  },
  p90: {
    sourceId: 'climatology',
    column: 'Pctl6',
    label: '90<sup>th</sup>',
    line: { color: CLIMATOLOGY_LINE_COLORS[1], width: 1 },
    fill: 'tozeroy',
    fillcolor: `${CLIMATOLOGY_FILL_COLORS[1]}22`,
    yAxis: 'y',
  },
  p80: {
    sourceId: 'climatology',
    column: 'Pctl5',
    label: '80<sup>th</sup>',
    line: { color: CLIMATOLOGY_LINE_COLORS[2], width: 1 },
    fill: 'tozeroy',
    fillcolor: `${CLIMATOLOGY_FILL_COLORS[2]}22`,
    yAxis: 'y',
  },
  p50: {
    sourceId: 'climatology',
    column: 'Pctl4',
    label: '50<sup>th</sup>',
    line: { color: CLIMATOLOGY_LINE_COLORS[3], width: 1 },
    fill: 'tozeroy',
    fillcolor: `${CLIMATOLOGY_FILL_COLORS[3]}22`,
    yAxis: 'y',
  },
  p20: {
    sourceId: 'climatology',
    column: 'Pctl3',
    label: '20<sup>th</sup>',
    line: { color: CLIMATOLOGY_LINE_COLORS[4], width: 1 },
    fill: 'tozeroy',
    fillcolor: `${CLIMATOLOGY_FILL_COLORS[4]}22`,
    yAxis: 'y',
  },
  p10: {
    sourceId: 'climatology',
    column: 'Pctl2',
    label: '10<sup>th</sup>',
    line: { color: CLIMATOLOGY_LINE_COLORS[5], width: 1 },
    fill: 'tozeroy',
    fillcolor: `${CLIMATOLOGY_FILL_COLORS[5]}22`,
    yAxis: 'y',
  },
  p5: {
    sourceId: 'climatology',
    column: 'Pctl1',
    label: '5<sup>th</sup>',
    line: { color: CLIMATOLOGY_LINE_COLORS[6], width: 1 },
    fill: 'tozeroy',
    fillcolor: CLIMATOLOGY_FILL_COLORS[6],
    yAxis: 'y',
  },
}

async function resolveDescriptorEndDate(hydrography) {
  const descriptor = await fetchGradesBinaryDescriptor()
  return descriptor?.[hydrography]?.end ?? descriptor?.MERIT?.end ?? null
}

function trimRowsToRecentWindow({ rows }) {
  return rows.slice(-RECENT_DAYS)
}

function buildGlobalReachRecentSources({ station }) {
  const baseSources = [
    {
      id: 'series',
      loader: 'gradesSeries',
      buildRequest: ({ station: currentStation }) => ({
        hydrography: currentStation.hydrography,
        comid: currentStation.binaryComid,
        dindex: currentStation.dindex,
        valueColumn: 'Flow',
      }),
      transformRows: trimRowsToRecentWindow,
    },
  ]

  if (station.layerId === 'gradesHydroDl') {
    baseSources.push({
      id: 'climatology',
      loader: 'gradesPercentiles',
      buildRequest: async ({ station: currentStation }) => ({
        hydrography: currentStation.hydrography,
        comid: currentStation.binaryComid,
        endDateText: await resolveDescriptorEndDate(currentStation.hydrography),
        dayCount: RECENT_DAYS,
        columnNames: CLIMATOLOGY_COLUMN_NAMES,
      }),
      transformRows: trimRowsToRecentWindow,
    })
  }

  return baseSources
}

function buildGlobalReachRecentSeries({ station }) {
  const series = {
    flow: {
      sourceId: 'series',
      column: 'Flow',
      label: 'GRADES-hydroDL Flow',
      line: { color: 'darkblue', width: 1.5 },
      yAxis: 'y',
    },
  }

  if (station.layerId === 'gradesHydroDl') {
    return {
      ...CLIMATOLOGY_SERIES_DEFINITIONS,
      ...series,
    }
  }

  return series
}

function buildGlobalReachFullHistorySources({ station }) {
  return [
    {
      id: 'series',
      loader: 'gradesSeries',
      buildRequest: ({ station: currentStation }) => ({
        hydrography: currentStation.hydrography,
        comid: currentStation.binaryComid,
        dindex: currentStation.dindex,
        valueColumn: 'Flow',
      }),
    },
  ]
}

function buildGlobalReachFullHistorySeries() {
  return {
    flow: {
      sourceId: 'series',
      column: 'Flow',
      label: 'GRADES-hydroDL Flow',
      line: { color: 'darkblue', width: 1.5 },
      yAxis: 'y',
    },
  }
}

function buildGlobalReachTitle(station) {
  if (station.layerId === 'swordReaches') {
    const firstLineParts = [
      `GRADES-hydroDL on SWORD, Reach ID (v17b): ${station.id}`,
    ]
    const secondLineParts = []

    if (station.reachIdV16) {
      firstLineParts.push(`Reach ID (v16): ${station.reachIdV16}`)
    }

    if (station.riverName) {
      secondLineParts.push(`Name: ${station.riverName}`)
    }

    if (Number.isFinite(station.reachLengthKm)) {
      secondLineParts.push(`Length: ${station.reachLengthKm.toFixed(1)} km`)
    }

    if (Number.isFinite(station.slopeMPerKm)) {
      secondLineParts.push(`Slope: ${station.slopeMPerKm.toFixed(3)} m/km`)
    }

    if (Number.isFinite(station.flowAccumulationKm2)) {
      secondLineParts.push(`Flow Accumulation: ${station.flowAccumulationKm2.toFixed(1)} km<sup>2</sup>`)
    }

    if (Number.isFinite(station.widthM)) {
      secondLineParts.push(`Width: ${station.widthM.toFixed(1)} m`)
    }

    if (secondLineParts.length > 0) {
      return `${firstLineParts.join(', ')}<br>${secondLineParts.join(', ')}`
    }

    return firstLineParts.join(', ')
  }

  const titleParts = [
    `GRADES-hydroDL (v2.0), COMID: ${station.comid ?? station.id}`,
  ]

  if (Number.isFinite(station.lengthKm)) {
    titleParts.push(`Length: ${station.lengthKm.toFixed(1)} km`)
  }

  if (Number.isFinite(station.upstreamAreaKm2)) {
    titleParts.push(`Area: ${station.upstreamAreaKm2.toFixed(0)} km<sup>2</sup>`)
  }

  if (Number.isFinite(station.streamOrder)) {
    titleParts.push(`Order: ${station.streamOrder}`)
  }

  return titleParts.join(', ')
}

export const GLOBAL_REACH_POPUP_TABS = [
  {
    id: 'recent',
    label: 'Recent 1 Year',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: buildGlobalReachRecentSources,
        hovermode: 'x unified',
        titleText: ({ station }) => buildGlobalReachTitle(station),
        layout: DEFAULT_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        axes: {
          y: {
            title: { text: 'Flow (m^3/s)', standoff: 0 },
            zeroline: false,
          },
        },
        series: buildGlobalReachRecentSeries,
      },
    ],
  },
  {
    id: 'history',
    label: 'Full History',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: buildGlobalReachFullHistorySources,
        hovermode: 'x unified',
        titleText: ({ station }) => buildGlobalReachTitle(station),
        layout: DEFAULT_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        axes: {
          y: {
            title: { text: 'Flow (m^3/s)', standoff: 0 },
            zeroline: false,
          },
        },
        series: buildGlobalReachFullHistorySeries,
      },
    ],
  },
]

export function getGlobalReachPopupTabDefinition(tabId) {
  return GLOBAL_REACH_POPUP_TABS.find((tab) => tab.id === tabId) ?? null
}

export function getDefaultGlobalReachPopupTabId() {
  return GLOBAL_REACH_POPUP_TABS[0]?.id ?? 'recent'
}

import { GSHA_SERIES_COLUMN_NAMES } from '../../lib/gshaBinaryData'
import { buildCsvDownloadFileName } from '../../lib/csvExport'
import {
  DEFAULT_TIMESERIES_LAYOUT,
  DEFAULT_TIMESERIES_PLOTLY_CONFIG,
} from '../cnrfcPointPopup/cnrfcPointPopupConfig'

export const GSHA_POPUP_WIDTH = '1100px'

const GSHA_TIMESERIES_LAYOUT = {
  ...DEFAULT_TIMESERIES_LAYOUT,
  title: {
    font: {
      size: 14,
    },
  },
}

const GSHA_SERIES_STYLE_BY_COLUMN = {
  Pctl1: {
    label: '1<sup>st</sup>',
    line: { color: '#ff3d00', width: 1 },
  },
  Pctl10: {
    label: '10<sup>th</sup>',
    line: { color: '#ff7a00', width: 1 },
  },
  Pctl25: {
    label: '25<sup>th</sup>',
    line: { color: '#ffd200', width: 1 },
  },
  Pctl50: {
    label: '50<sup>th</sup>',
    line: { color: '#0fb33d', width: 1.2 },
  },
  Pctl75: {
    label: '75<sup>th</sup>',
    line: { color: '#0fa282', width: 1 },
  },
  Pctl90: {
    label: '90<sup>th</sup>',
    line: { color: '#0a36ff', width: 1 },
  },
  Pctl99: {
    label: '99<sup>th</sup>',
    line: { color: '#8a4cb4', width: 1 },
  },
  Mean: {
    label: 'Mean',
    line: { color: 'darkblue', width: 1.8 },
  },
  Maximum: {
    label: 'Maximum',
    line: { color: 'magenta', width: 1.5 },
  },
}

function buildGshaPopupSources(frequency) {
  return ({ station }) => [
    {
      id: frequency,
      loader: 'gshaSeries',
      buildRequest: () => ({
        frequency,
        dindex: station.dindex,
        columnNames: GSHA_SERIES_COLUMN_NAMES,
      }),
    },
  ]
}

function buildGshaPopupSeries(frequency) {
  return Object.fromEntries(
    GSHA_SERIES_COLUMN_NAMES.map((columnName) => [
      columnName,
      {
        sourceId: frequency,
        column: columnName,
        yAxis: 'y',
        ...GSHA_SERIES_STYLE_BY_COLUMN[columnName],
      },
    ]),
  )
}

function buildGshaPopupCsvDownloadFileName(context) {
  const station = context.station ?? {}

  return buildCsvDownloadFileName({
    prefix: 'gsha',
    stationId: station.agency ?? 'gsha',
    sourceId: context.sourceId,
    defaultFileName: context.defaultFileName,
    extraParts: [station.stationId ?? station.id ?? 'station'],
  })
}

function buildGshaPopupTitle(station) {
  const titleParts = [
    `${station.agency ?? 'GSHA'} ${station.stationShortName ?? station.stationId ?? station.id} (GSHA #${station.dindex})`,
  ]

  if (Number.isFinite(station.watershedAreaKm2)) {
    titleParts.push(`Watershed Area: ${station.watershedAreaKm2.toFixed(1)} km<sup>2</sup>`)
  }

  if (station.comid) {
    titleParts.push(`MERIT-Basins COMID: ${station.comid}`)
  }

  return titleParts.join(', ')
}

function buildGshaPlotDefinition({ id, label, frequency }) {
  return {
    id,
    label,
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: buildGshaPopupSources(frequency),
        hovermode: 'x unified',
        titleText: ({ station }) => buildGshaPopupTitle(station),
        layout: GSHA_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        csvDownload: {
          enabled: true,
          fileName: buildGshaPopupCsvDownloadFileName,
        },
        axes: {
          y: {
            title: { text: 'Flow (m<sup>3</sup>/s)', standoff: 0 },
            zeroline: false,
          },
        },
        series: () => buildGshaPopupSeries(frequency),
      },
    ],
  }
}

export const GSHA_POPUP_TABS = [
  buildGshaPlotDefinition({
    id: 'monthly',
    label: 'Monthly',
    frequency: 'monthly',
  }),
  buildGshaPlotDefinition({
    id: 'yearly',
    label: 'Yearly',
    frequency: 'yearly',
  }),
]

export function getGshaPopupTabDefinition(tabId) {
  return GSHA_POPUP_TABS.find((tab) => tab.id === tabId) ?? null
}

export function getDefaultGshaPopupTabId() {
  return GSHA_POPUP_TABS[0]?.id ?? 'monthly'
}

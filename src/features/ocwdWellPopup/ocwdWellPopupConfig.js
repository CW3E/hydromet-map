import { buildCsvDownloadFileName } from '../../lib/csvExport'
import {
  DEFAULT_TIMESERIES_LAYOUT,
  DEFAULT_TIMESERIES_PLOTLY_CONFIG,
} from '../cnrfcPointPopup/cnrfcPointPopupConfig'

export const OCWD_WELL_POPUP_WIDTH = '1100px'

const OCWD_WELL_TIMESERIES_LAYOUT = {
  ...DEFAULT_TIMESERIES_LAYOUT,
  title: {
    font: {
      size: 14,
    },
  },
}

function buildOcwdWellCsvUrl({ station }) {
  return `https://cw3e.ucsd.edu/hydro/ocwd/csv/wells/${station.stationId}.csv`
}

function buildOcwdWellDownloadFileName(context) {
  const station = context.station ?? {}

  return buildCsvDownloadFileName({
    prefix: 'ocwd-well',
    stationId: station.stationId ?? station.id ?? 'ocwd-well',
    sourceId: context.sourceId,
    defaultFileName: context.defaultFileName,
  })
}

function buildOcwdWellPlotTitle(station) {
  const titleParts = [
    `${station.stationId ?? station.id}`,
  ]

  if (station.stationName) {
    titleParts.push(station.stationName)
  }

  if (station.status) {
    titleParts.push(`Status: ${station.status}`)
  }

  return titleParts.join(', ')
}

export const OCWD_WELL_POPUP_TABS = [
  {
    id: 'depth',
    label: 'Depth to Groundwater',
    plots: [
      {
        id: 'main',
        type: 'timeseries',
        sources: [
          {
            id: 'depth',
            loader: 'csv',
            buildUrl: buildOcwdWellCsvUrl,
          },
        ],
        hovermode: 'x unified',
        titleText: ({ station }) => buildOcwdWellPlotTitle(station),
        layout: OCWD_WELL_TIMESERIES_LAYOUT,
        plotlyConfig: DEFAULT_TIMESERIES_PLOTLY_CONFIG,
        csvDownload: {
          enabled: true,
          fileName: buildOcwdWellDownloadFileName,
        },
        axes: {
          y: {
            title: { text: 'Depth to Groundwater (ft)', standoff: 0 },
            zeroline: false,
          },
        },
        series: {
          depth: {
            sourceId: 'depth',
            column: 'depth',
            label: 'Depth to Groundwater',
            yAxis: 'y',
            mode: 'markers',
            marker: { color: 'darkorange', size: 5 },
          },
        },
      },
    ],
  },
]

export function getOcwdWellPopupTabDefinition(tabId) {
  return OCWD_WELL_POPUP_TABS.find((tab) => tab.id === tabId) ?? null
}

export function getDefaultOcwdWellPopupTabId() {
  return OCWD_WELL_POPUP_TABS[0]?.id ?? 'depth'
}

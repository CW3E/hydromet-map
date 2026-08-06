import { buildCsvDownloadFileName } from '../../lib/csvExport'
import {
  DEFAULT_TIMESERIES_LAYOUT,
  DEFAULT_TIMESERIES_PLOTLY_CONFIG,
  TIMESERIES_POPUP_WIDTH,
} from '../cnrfcPointPopup/cnrfcPointPopupConfig'

const CW3E_MET_OBS_CSV_ROOT = 'https://cw3e.ucsd.edu/hydro/cw3e_obs/csv/hourly'

export const CW3E_MET_OBS_POPUP_WIDTH = TIMESERIES_POPUP_WIDTH

function buildObservationUrl({ stationId }) {
  return `${CW3E_MET_OBS_CSV_ROOT}/${encodeURIComponent(stationId)}/latest_183d.csv`
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

export const CW3E_MET_OBS_POPUP_TABS = [
  {
    id: 'precipitation',
    label: 'Precipitation',
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
            title: { text: 'Precipitation (mm)', standoff: 0 },
            rangemode: 'tozero',
            zeroline: true,
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
        },
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

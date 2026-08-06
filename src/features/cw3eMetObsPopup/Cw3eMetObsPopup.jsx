import { useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import PopupCsvDownloadButton from '../../components/PopupCsvDownloadButton'
import { downloadCsvFiles } from '../../lib/csvExport'
import TimeSeriesPlot from '../cnrfcPointPopup/TimeSeriesPlot'
import {
  CW3E_MET_OBS_POPUP_TABS,
  CW3E_MET_OBS_POPUP_WIDTH,
  getCw3eMetObsPopupTabDefinition,
} from './cw3eMetObsPopupConfig'
import {
  loadCw3eMetObsPopupTabData,
  setActiveCw3eMetObsPopupTab,
} from './cw3eMetObsPopupData'

function renderPlot(plotState, station) {
  if (plotState?.status === 'loading') {
    return <p className="station-popup__status">Loading observation data...</p>
  }
  if (plotState?.status === 'error') {
    return <p className="station-popup__status station-popup__status--error">{plotState.error}</p>
  }
  if (plotState?.status === 'ready' && plotState.traces.length === 0) {
    return <p className="station-popup__status">No data available for this tab.</p>
  }
  if (plotState?.status === 'ready') {
    return (
      <div className="station-popup__plot">
        <TimeSeriesPlot stationName={station.name} stationId={station.id} plotState={plotState} />
      </div>
    )
  }
  return <p className="station-popup__status">Select a tab to load its plot data.</p>
}

export default function Cw3eMetObsPopup({ selectedStation, setSelectedStation }) {
  const [isDownloading, setIsDownloading] = useState(false)

  if (!selectedStation || selectedStation.popupType !== 'cw3e-met-obs') return null

  const activeTabId = selectedStation.popup?.activeTabId ?? CW3E_MET_OBS_POPUP_TABS[0].id
  const visibleTabs = CW3E_MET_OBS_POPUP_TABS.filter(
    (tab) => tab.id !== 'soil' || selectedStation.popup?.hasSoilOrSnowData || activeTabId === 'soil',
  )
  const activeTab = getCw3eMetObsPopupTabDefinition(activeTabId)
  const activeTabState = selectedStation.popup?.tabDataById?.[activeTabId]
  const downloadFiles = (activeTab?.plots ?? []).flatMap(
    (plot) => activeTabState?.plotsById?.[plot.id]?.downloadFiles ?? [],
  )

  async function handleDownload() {
    if (!downloadFiles.length || isDownloading) return
    setIsDownloading(true)
    try {
      await downloadCsvFiles(downloadFiles)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Popup
      anchor="top"
      closeButton
      closeOnClick={false}
      latitude={selectedStation.latitude}
      longitude={selectedStation.longitude}
      maxWidth={CW3E_MET_OBS_POPUP_WIDTH}
      onClose={() => setSelectedStation(null)}
    >
      <div className="station-popup station-popup--timeseries">
        <div className="station-popup__header-row">
          <div className="station-popup__tabs" role="tablist" aria-label="CW3E observation tabs">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTabId === tab.id}
                className={activeTabId === tab.id ? 'station-popup__tab is-active' : 'station-popup__tab'}
                onClick={() => {
                  setActiveCw3eMetObsPopupTab(setSelectedStation, tab.id)
                  loadCw3eMetObsPopupTabData(setSelectedStation, selectedStation, tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <PopupCsvDownloadButton
            disabled={!downloadFiles.length || isDownloading}
            onClick={handleDownload}
            title={isDownloading ? 'Downloading CSV...' : 'Download CSV'}
          />
        </div>

        {activeTab?.plots.map((plot) => (
          <div key={plot.id} className="station-popup__plot-panel">
            {renderPlot(activeTabState?.plotsById?.[plot.id], selectedStation)}
          </div>
        ))}
      </div>
    </Popup>
  )
}

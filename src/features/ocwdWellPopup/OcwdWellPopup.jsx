import { useEffect, useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import PopupCsvDownloadButton from '../../components/PopupCsvDownloadButton'
import { downloadCsvFiles } from '../../lib/csvExport'
import TimeSeriesPlot from '../cnrfcPointPopup/TimeSeriesPlot'
import {
  OCWD_WELL_POPUP_WIDTH,
  getOcwdWellPopupTabDefinition,
} from './ocwdWellPopupConfig'
import {
  loadOcwdWellPopupTabData,
  setActiveOcwdWellPopupTab,
} from './ocwdWellPopupData'

function renderPlotPanel(plotState, station) {
  if (plotState.status === 'loading') {
    return <p className="station-popup__status">Loading plot data...</p>
  }

  if (plotState.status === 'error') {
    return <p className="station-popup__status station-popup__status--error">{plotState.error}</p>
  }

  if (plotState.status === 'ready') {
    return (
      <div className="station-popup__plot">
        <TimeSeriesPlot
          stationName={station.stationName || station.stationId || station.id}
          stationId={station.stationId ?? station.id}
          plotState={plotState}
        />
      </div>
    )
  }

  return <p className="station-popup__status">Select a tab to load its plot data.</p>
}

export default function OcwdWellPopup({
  ownerLayerId,
  selectedStation,
  setSelectedStation,
}) {
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false)
  const tabs = [
    getOcwdWellPopupTabDefinition('depth'),
  ].filter(Boolean)
  const requestedTabId = selectedStation?.popup?.activeTabId
  const activeTabId = tabs.some((tab) => tab.id === requestedTabId)
    ? requestedTabId
    : (tabs[0]?.id ?? 'depth')
  const activeTabDefinition = getOcwdWellPopupTabDefinition(activeTabId)
  const activeTabState = selectedStation?.popup?.tabDataById?.[activeTabId]
  const exportablePlots = (activeTabDefinition?.plots ?? []).filter(
    (plotDefinition) => plotDefinition.csvDownload?.enabled,
  )
  const activeTabDownloadFiles = exportablePlots.flatMap(
    (plotDefinition) => activeTabState?.plotsById?.[plotDefinition.id]?.downloadFiles ?? [],
  )
  const canDownloadCsv = exportablePlots.length > 0
  const isCsvDownloadReady =
    canDownloadCsv
    && exportablePlots.every(
      (plotDefinition) => activeTabState?.plotsById?.[plotDefinition.id]?.status === 'ready',
    )
    && activeTabDownloadFiles.length > 0

  useEffect(() => {
    if (
      !selectedStation
      || selectedStation.popupType !== 'ocwd-well'
      || selectedStation.popupOwnerId !== ownerLayerId
    ) {
      return
    }

    loadOcwdWellPopupTabData(setSelectedStation, selectedStation, activeTabId)
  }, [activeTabId, ownerLayerId, selectedStation, setSelectedStation])

  if (
    !selectedStation
    || selectedStation.popupType !== 'ocwd-well'
    || selectedStation.popupOwnerId !== ownerLayerId
  ) {
    return null
  }

  async function handleDownloadCsv() {
    if (!isCsvDownloadReady || isDownloadingCsv) {
      return
    }

    setIsDownloadingCsv(true)

    try {
      await downloadCsvFiles(activeTabDownloadFiles)
    } catch (error) {
      console.error('Failed to download CSV files for OCWD well popup.', error)
    } finally {
      setIsDownloadingCsv(false)
    }
  }

  return (
    <Popup
      anchor="top"
      closeButton
      closeOnClick={false}
      closeOnMove={false}
      latitude={selectedStation.latitude}
      longitude={selectedStation.longitude}
      maxWidth={OCWD_WELL_POPUP_WIDTH}
      onClose={() => setSelectedStation(null)}
    >
      <div className="station-popup station-popup--timeseries">
        <div className="station-popup__header-row">
          <div className="station-popup__tabs" role="tablist" aria-label="OCWD well tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTabId === tab.id}
                className={activeTabId === tab.id ? 'station-popup__tab is-active' : 'station-popup__tab'}
                onClick={() => {
                  setActiveOcwdWellPopupTab(setSelectedStation, tab.id)
                  loadOcwdWellPopupTabData(setSelectedStation, selectedStation, tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <PopupCsvDownloadButton
            disabled={!isCsvDownloadReady || isDownloadingCsv}
            onClick={handleDownloadCsv}
            title={
              canDownloadCsv
                ? (isDownloadingCsv ? 'Downloading CSV files...' : 'Download CSV files')
                : 'CSV download is not available for this tab'
            }
          />
        </div>

        {tabs.map((tab) => {
          const tabDefinition = getOcwdWellPopupTabDefinition(tab.id)
          const tabState = selectedStation.popup?.tabDataById?.[tab.id]

          return (
            <div
              key={tab.id}
              className="station-popup__tab-panel"
              role="tabpanel"
              hidden={activeTabId !== tab.id}
            >
              {tabDefinition?.plots.map((plotDefinition) => {
                const plotState = tabState?.plotsById?.[plotDefinition.id]

                return (
                  <div key={plotDefinition.id} className="station-popup__plot-panel">
                    {renderPlotPanel(
                      plotState ?? {
                        status: 'idle',
                        error: null,
                      },
                      selectedStation,
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </Popup>
  )
}

import { useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import PopupCsvDownloadButton from '../../components/PopupCsvDownloadButton'
import { downloadCsvFiles } from '../../lib/csvExport'
import { CNRFC_POINT_POPUP_WIDTH } from './cnrfcPointPopupConfig'
import {
  CNRFC_POINT_POPUP_FORECAST_PRODUCTS,
  getCnrfcPointPopupTabDefinition,
} from './cnrfcPointPopupConfig'
import {
  getCnrfcPointPopupTabs,
  loadCnrfcPointPopupTabData,
  setActiveCnrfcPointPopupTab,
  setCnrfcPointPopupForecastProduct,
} from './cnrfcPointPopupData'
import TimeSeriesPlot from './TimeSeriesPlot'

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
          stationName={station.name}
          stationId={station.id}
          plotState={plotState}
        />
      </div>
    )
  }

  return <p className="station-popup__status">Select a tab to load its plot data.</p>
}

export default function CnrfcPointPopup({
  selectedStation,
  setSelectedStation,
}) {
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false)

  if (!selectedStation || selectedStation.popupType !== 'cnrfc-points') {
    return null
  }

  const tabs = getCnrfcPointPopupTabs()
  const activeTabId = selectedStation.popup?.activeTabId ?? tabs[0]?.id ?? 'daily'
  const forecastProduct = selectedStation.popup?.forecastProduct ?? CNRFC_POINT_POPUP_FORECAST_PRODUCTS[0].id
  const activeTabDefinition = getCnrfcPointPopupTabDefinition(activeTabId)
  const activeTabState = selectedStation.popup?.tabDataById?.[activeTabId]
  const exportablePlots = (activeTabDefinition?.plots ?? []).filter(
    (plotDefinition) => plotDefinition.csvDownload?.enabled,
  )
  const activeTabDownloadFiles = exportablePlots.flatMap(
    (plotDefinition) => activeTabState?.plotsById?.[plotDefinition.id]?.downloadFiles ?? [],
  )
  const isCsvDownloadReady =
    exportablePlots.length > 0
    && exportablePlots.every(
      (plotDefinition) => activeTabState?.plotsById?.[plotDefinition.id]?.status === 'ready',
    )
    && activeTabDownloadFiles.length > 0

  async function handleDownloadCsv() {
    if (!isCsvDownloadReady || isDownloadingCsv) {
      return
    }

    setIsDownloadingCsv(true)

    try {
      await downloadCsvFiles(activeTabDownloadFiles)
    } catch (error) {
      console.error('Failed to download CSV files for CNRFC popup.', error)
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
      maxWidth={CNRFC_POINT_POPUP_WIDTH}
      onClose={() => setSelectedStation(null)}
    >
      <div className="station-popup station-popup--timeseries">
        <div className="station-popup__header-row">
          <div className="station-popup__tabs" role="tablist" aria-label="Station time-series tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTabId === tab.id}
                className={activeTabId === tab.id ? 'station-popup__tab is-active' : 'station-popup__tab'}
                onClick={() => {
                  setActiveCnrfcPointPopupTab(setSelectedStation, tab.id)
                  loadCnrfcPointPopupTabData(setSelectedStation, selectedStation, tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="station-popup__control">
            <span>Forecast Product</span>
            <select
              value={forecastProduct}
              onChange={(event) => {
                const nextForecastProduct = event.target.value
                const nextStation = {
                  ...selectedStation,
                  popup: {
                    ...selectedStation.popup,
                    forecastProduct: nextForecastProduct,
                  },
                }

                setCnrfcPointPopupForecastProduct(setSelectedStation, nextForecastProduct)
                loadCnrfcPointPopupTabData(setSelectedStation, nextStation, activeTabId)
              }}
            >
              {CNRFC_POINT_POPUP_FORECAST_PRODUCTS.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.label}
                </option>
              ))}
            </select>
          </label>

          <PopupCsvDownloadButton
            disabled={!isCsvDownloadReady || isDownloadingCsv}
            onClick={handleDownloadCsv}
            title={isDownloadingCsv ? 'Downloading CSV files...' : 'Download CSV files'}
          />
        </div>

        {tabs.map((tab) => {
          const tabDefinition = getCnrfcPointPopupTabDefinition(tab.id)
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

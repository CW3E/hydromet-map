import { Popup } from 'react-map-gl/maplibre'
import { STATION_POPUP_WIDTH } from './stationPopupConfig'
import {
  STATION_POPUP_FORECAST_PRODUCTS,
  getStationPopupTabDefinition,
} from './stationPopupConfig'
import {
  getStationPopupTabs,
  loadStationPopupTabData,
  setActiveStationPopupTab,
  setStationPopupForecastProduct,
} from './stationPopupData'
import StationTimeSeriesPlot from './StationTimeSeriesPlot'

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
        <StationTimeSeriesPlot
          stationName={station.name}
          stationId={station.id}
          plotState={plotState}
        />
      </div>
    )
  }

  return <p className="station-popup__status">Select a tab to load its plot data.</p>
}

export default function StationPopup({
  selectedStation,
  setSelectedStation,
}) {
  if (!selectedStation) {
    return null
  }

  const tabs = getStationPopupTabs()
  const activeTabId = selectedStation.popup?.activeTabId ?? tabs[0]?.id ?? 'daily'
  const forecastProduct = selectedStation.popup?.forecastProduct ?? STATION_POPUP_FORECAST_PRODUCTS[0].id

  return (
    <Popup
      anchor="top"
      closeButton
      closeOnClick={false}
      latitude={selectedStation.latitude}
      longitude={selectedStation.longitude}
      maxWidth={STATION_POPUP_WIDTH}
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
                  setActiveStationPopupTab(setSelectedStation, tab.id)
                  loadStationPopupTabData(setSelectedStation, selectedStation, tab.id)
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

                setStationPopupForecastProduct(setSelectedStation, nextForecastProduct)
                loadStationPopupTabData(setSelectedStation, nextStation, activeTabId)
              }}
            >
              {STATION_POPUP_FORECAST_PRODUCTS.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {tabs.map((tab) => {
          const tabDefinition = getStationPopupTabDefinition(tab.id)
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

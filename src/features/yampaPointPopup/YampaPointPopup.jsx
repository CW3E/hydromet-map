import { useEffect, useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import TimeSeriesPlot from '../cnrfcPointPopup/TimeSeriesPlot'
import { fetchJsonNoCache } from '../../lib/network'
import YampaPointPopupTable from './YampaPointPopupTable'
import {
  YAMPA_POINT_FORECAST_UPDATE_OPTIONS,
  YAMPA_POINT_FORECAST_UPDATES_URL,
  YAMPA_POINT_POST_PROCESSING_OPTIONS,
  YAMPA_POINT_POPUP_WIDTH,
  doesYampaPointTabUseForecastUpdate,
  doesYampaPointTabUsePostProcessing,
  getYampaPointPopupTabDefinition,
  normalizeYampaForecastUpdateDate,
} from './yampaPointPopupConfig'
import {
  getYampaPointPopupTabs,
  loadYampaPointPopupTabData,
  setActiveYampaPointPopupTab,
  setYampaPointForecastPostProcessing,
  setYampaPointForecastUpdateDate,
} from './yampaPointPopupData'

function renderPlotPanel(plotState, station) {
  if (plotState.status === 'loading') {
    return <p className="station-popup__status">Loading plot data...</p>
  }

  if (plotState.status === 'error') {
    return <p className="station-popup__status station-popup__status--error">{plotState.error}</p>
  }

  if (plotState.status === 'ready') {
    return (
      <>
        <div
          className="station-popup__plot"
          style={plotState.plotHeight ? { height: `${plotState.plotHeight}px` } : undefined}
        >
          {plotState.plotType === 'timeseries' ? (
            <TimeSeriesPlot
              stationName={station.name}
              stationId={station.stationId}
              plotState={plotState}
            />
          ) : (
            <YampaPointPopupTable
              stationId={station.stationId}
              plotState={plotState}
            />
          )}
        </div>
        {plotState.footerText && plotState.plotType === 'timeseries' ? (
          <p
            className="station-popup__footer"
            dangerouslySetInnerHTML={{ __html: plotState.footerText }}
          />
        ) : null}
      </>
    )
  }

  return <p className="station-popup__status">Select a tab to load its plot data.</p>
}

export default function YampaPointPopup({
  selectedStation,
  setSelectedStation,
}) {
  const [forecastUpdateOptions, setForecastUpdateOptions] = useState(YAMPA_POINT_FORECAST_UPDATE_OPTIONS)
  const tabs = getYampaPointPopupTabs()
  const activeTabId = selectedStation?.popup?.activeTabId ?? tabs[0]?.id ?? 'nrt-forecast'
  const forecastUpdateDate = selectedStation?.popup?.forecastUpdateDate ?? ''
  const forecastPostProcessing =
    selectedStation?.popup?.forecastPostProcessing ?? YAMPA_POINT_POST_PROCESSING_OPTIONS[0].id
  const forecastUpdateEnabled = doesYampaPointTabUseForecastUpdate(activeTabId)
  const postProcessingEnabled = doesYampaPointTabUsePostProcessing(activeTabId)

  useEffect(() => {
    let isCancelled = false

    async function loadForecastUpdateOptions() {
      try {
        const response = await fetchJsonNoCache(YAMPA_POINT_FORECAST_UPDATES_URL)

        if (!response.ok) {
          return
        }

        const json = await response.json()
        const nextOptions = Array.isArray(json?.tupdates)
          ? json.tupdates
            .map((value) => normalizeYampaForecastUpdateDate(value))
            .filter(Boolean)
          : []

        if (!isCancelled && nextOptions.length > 0) {
          setForecastUpdateOptions(nextOptions)
        }
      } catch {
        if (!isCancelled) {
          setForecastUpdateOptions(YAMPA_POINT_FORECAST_UPDATE_OPTIONS)
        }
      }
    }

    loadForecastUpdateOptions()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedStation || selectedStation.popupType !== 'yampa-points') {
      return
    }

    const nextForecastUpdateDate = forecastUpdateOptions[forecastUpdateOptions.length - 1]

    if (!nextForecastUpdateDate) {
      return
    }

    if (forecastUpdateOptions.includes(forecastUpdateDate)) {
      loadYampaPointPopupTabData(setSelectedStation, selectedStation, activeTabId)
      return
    }

    const nextStation = {
      ...selectedStation,
      popup: {
        ...selectedStation.popup,
        forecastUpdateDate: nextForecastUpdateDate,
      },
    }

    setYampaPointForecastUpdateDate(setSelectedStation, nextForecastUpdateDate)
    loadYampaPointPopupTabData(setSelectedStation, nextStation, activeTabId)
  }, [
    activeTabId,
    forecastUpdateDate,
    forecastUpdateOptions,
    selectedStation,
    setSelectedStation,
  ])

  if (!selectedStation || selectedStation.popupType !== 'yampa-points') {
    return null
  }

  return (
    <Popup
      anchor="top"
      closeButton
      closeOnClick={false}
      latitude={selectedStation.latitude}
      longitude={selectedStation.longitude}
      maxWidth={YAMPA_POINT_POPUP_WIDTH}
      onClose={() => setSelectedStation(null)}
    >
      <div className="station-popup station-popup--timeseries">
        <div className="station-popup__header-row">
          <div className="station-popup__tabs" role="tablist" aria-label="Yampa point tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTabId === tab.id}
                className={activeTabId === tab.id ? 'station-popup__tab is-active' : 'station-popup__tab'}
                onClick={() => {
                  setActiveYampaPointPopupTab(setSelectedStation, tab.id)
                  loadYampaPointPopupTabData(setSelectedStation, selectedStation, tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="station-popup__control station-popup__control--compact">
            <span>Update:</span>
            <select
              value={forecastUpdateDate}
              disabled={!forecastUpdateEnabled}
              onChange={(event) => {
                if (!forecastUpdateEnabled) {
                  return
                }

                const nextForecastUpdateDate = event.target.value
                const nextStation = {
                  ...selectedStation,
                  popup: {
                    ...selectedStation.popup,
                    forecastUpdateDate: nextForecastUpdateDate,
                  },
                }

                setYampaPointForecastUpdateDate(setSelectedStation, nextForecastUpdateDate)
                loadYampaPointPopupTabData(setSelectedStation, nextStation, activeTabId)
              }}
            >
              {forecastUpdateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="station-popup__control station-popup__control--compact">
            <span>Post-Processing:</span>
            <select
              value={forecastPostProcessing}
              disabled={!postProcessingEnabled}
              onChange={(event) => {
                if (!postProcessingEnabled) {
                  return
                }

                const nextForecastPostProcessing = event.target.value
                const nextStation = {
                  ...selectedStation,
                  popup: {
                    ...selectedStation.popup,
                    forecastPostProcessing: nextForecastPostProcessing,
                  },
                }

                setYampaPointForecastPostProcessing(setSelectedStation, nextForecastPostProcessing)
                loadYampaPointPopupTabData(setSelectedStation, nextStation, activeTabId)
              }}
            >
              {YAMPA_POINT_POST_PROCESSING_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(() => {
          const activeTabDefinition = getYampaPointPopupTabDefinition(activeTabId)
          const activeTabState = selectedStation.popup?.tabDataById?.[activeTabId]
          const tabPanelClassName =
            activeTabDefinition?.plots?.length > 1
              ? 'station-popup__tab-panel station-popup__tab-panel--grid'
              : 'station-popup__tab-panel'

          return (
            <div
              key={activeTabId}
              className={tabPanelClassName}
              role="tabpanel"
            >
              {activeTabDefinition?.plots.map((plotDefinition) => {
                const plotState = activeTabState?.plotsById?.[plotDefinition.id]

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
        })()}
      </div>
    </Popup>
  )
}



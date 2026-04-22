import { useEffect, useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import TimeSeriesPlot from '../cnrfcPointPopup/TimeSeriesPlot'
import { fetchJsonNoCache } from '../../lib/network'
import B120PointPopupTable from './B120PointPopupTable'
import {
  B120_POINT_FORECAST_UPDATE_OPTIONS,
  B120_POINT_FORECAST_UPDATES_URL,
  B120_POINT_POST_PROCESSING_OPTIONS,
  B120_POINT_POPUP_WIDTH,
  doesB120PointTabUseForecastUpdate,
  doesB120PointTabUsePostProcessing,
  getB120PointPopupTabDefinition,
  normalizeB120ForecastUpdateDate,
} from './b120PointPopupConfig'
import {
  getB120PointPopupTabs,
  loadB120PointPopupTabData,
  setActiveB120PointPopupTab,
  setB120PointForecastPostProcessing,
  setB120PointForecastUpdateDate,
} from './b120PointPopupData'

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
              stationName={station.location}
              stationId={station.stationId}
              plotState={plotState}
            />
          ) : (
            <B120PointPopupTable
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

export default function B120PointPopup({
  selectedStation,
  setSelectedStation,
}) {
  const [forecastUpdateOptions, setForecastUpdateOptions] = useState(B120_POINT_FORECAST_UPDATE_OPTIONS)
  const tabs = getB120PointPopupTabs()
  const activeTabId = selectedStation?.popup?.activeTabId ?? tabs[0]?.id ?? 'nrt-forecast'
  const forecastUpdateDate = selectedStation?.popup?.forecastUpdateDate ?? ''
  const forecastPostProcessing =
    selectedStation?.popup?.forecastPostProcessing ?? B120_POINT_POST_PROCESSING_OPTIONS[0].id
  const forecastUpdateEnabled = doesB120PointTabUseForecastUpdate(activeTabId)
  const postProcessingEnabled = doesB120PointTabUsePostProcessing(activeTabId)

  useEffect(() => {
    let isCancelled = false

    async function loadForecastUpdateOptions() {
      try {
        const response = await fetchJsonNoCache(B120_POINT_FORECAST_UPDATES_URL)

        if (!response.ok) {
          return
        }

        const json = await response.json()
        const nextOptions = Array.isArray(json?.tupdates)
          ? json.tupdates
            .map((value) => normalizeB120ForecastUpdateDate(value))
            .filter(Boolean)
          : []

        if (!isCancelled && nextOptions.length > 0) {
          setForecastUpdateOptions(nextOptions)
        }
      } catch {
        if (!isCancelled) {
          setForecastUpdateOptions(B120_POINT_FORECAST_UPDATE_OPTIONS)
        }
      }
    }

    loadForecastUpdateOptions()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedStation || selectedStation.popupType !== 'b120-points') {
      return
    }

    const nextForecastUpdateDate = forecastUpdateOptions[forecastUpdateOptions.length - 1]

    if (!nextForecastUpdateDate) {
      return
    }

    if (forecastUpdateOptions.includes(forecastUpdateDate)) {
      loadB120PointPopupTabData(setSelectedStation, selectedStation, activeTabId)
      return
    }

    const nextStation = {
      ...selectedStation,
      popup: {
        ...selectedStation.popup,
        forecastUpdateDate: nextForecastUpdateDate,
      },
    }

    setB120PointForecastUpdateDate(setSelectedStation, nextForecastUpdateDate)
    loadB120PointPopupTabData(setSelectedStation, nextStation, activeTabId)
  }, [
    activeTabId,
    forecastUpdateDate,
    forecastUpdateOptions,
    selectedStation,
    setSelectedStation,
  ])

  if (!selectedStation || selectedStation.popupType !== 'b120-points') {
    return null
  }

  return (
    <Popup
      anchor="top"
      closeButton
      closeOnClick={false}
      latitude={selectedStation.latitude}
      longitude={selectedStation.longitude}
      maxWidth={B120_POINT_POPUP_WIDTH}
      onClose={() => setSelectedStation(null)}
    >
      <div className="station-popup station-popup--timeseries">
        <div className="station-popup__header-row">
          <div className="station-popup__tabs" role="tablist" aria-label="B120 point tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTabId === tab.id}
                className={activeTabId === tab.id ? 'station-popup__tab is-active' : 'station-popup__tab'}
                onClick={() => {
                  setActiveB120PointPopupTab(setSelectedStation, tab.id)
                  loadB120PointPopupTabData(setSelectedStation, selectedStation, tab.id)
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

                setB120PointForecastUpdateDate(setSelectedStation, nextForecastUpdateDate)
                loadB120PointPopupTabData(setSelectedStation, nextStation, activeTabId)
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

                setB120PointForecastPostProcessing(setSelectedStation, nextForecastPostProcessing)
                loadB120PointPopupTabData(setSelectedStation, nextStation, activeTabId)
              }}
            >
              {B120_POINT_POST_PROCESSING_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(() => {
          const activeTabDefinition = getB120PointPopupTabDefinition(activeTabId)
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

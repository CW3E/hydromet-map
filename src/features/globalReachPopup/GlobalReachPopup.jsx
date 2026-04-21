import { useEffect } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import TimeSeriesPlot from '../cnrfcPointPopup/TimeSeriesPlot'
import {
  GLOBAL_REACH_POPUP_WIDTH,
  getGlobalReachPopupTabDefinition,
} from './globalReachPopupConfig'
import {
  getGlobalReachPopupTabs,
  loadGlobalReachPopupTabData,
  setActiveGlobalReachPopupTab,
} from './globalReachPopupData'

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
          stationName={station.name || station.id}
          stationId={station.id}
          plotState={plotState}
        />
      </div>
    )
  }

  return <p className="station-popup__status">Select a tab to load its plot data.</p>
}

export default function GlobalReachPopup({
  ownerLayerId,
  selectedStation,
  setSelectedStation,
}) {
  const tabs = getGlobalReachPopupTabs(selectedStation)
  const requestedTabId = selectedStation?.popup?.activeTabId
  const activeTabId = tabs.some((tab) => tab.id === requestedTabId)
    ? requestedTabId
    : (tabs[0]?.id ?? 'daily')

  useEffect(() => {
    if (
      !selectedStation
      || selectedStation.popupType !== 'global-reach'
      || selectedStation.popupOwnerId !== ownerLayerId
    ) {
      return
    }

    loadGlobalReachPopupTabData(setSelectedStation, selectedStation, activeTabId)
  }, [activeTabId, ownerLayerId, selectedStation, setSelectedStation])

  if (
    !selectedStation
    || selectedStation.popupType !== 'global-reach'
    || selectedStation.popupOwnerId !== ownerLayerId
  ) {
    return null
  }

  return (
    <Popup
      anchor="top"
      closeButton
      closeOnClick={false}
      closeOnMove={false}
      latitude={selectedStation.latitude}
      longitude={selectedStation.longitude}
      maxWidth={GLOBAL_REACH_POPUP_WIDTH}
      onClose={() => setSelectedStation(null)}
    >
      <div className="station-popup station-popup--timeseries">
        <div className="station-popup__header-row">
          <div className="station-popup__tabs" role="tablist" aria-label="Global reach tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTabId === tab.id}
                className={activeTabId === tab.id ? 'station-popup__tab is-active' : 'station-popup__tab'}
                onClick={() => {
                  setActiveGlobalReachPopupTab(setSelectedStation, tab.id)
                  loadGlobalReachPopupTabData(setSelectedStation, selectedStation, tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {tabs.map((tab) => {
          const tabDefinition = getGlobalReachPopupTabDefinition(tab.id)
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

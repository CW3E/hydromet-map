import { useMemo } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import PopupCsvDownloadButton from '../../components/PopupCsvDownloadButton'
import { buildGeneratedCsvDownloadFiles, downloadCsvFiles } from '../../lib/csvExport'
import TimeSeriesPlot from '../cnrfcPointPopup/TimeSeriesPlot'
import { getArReconFlightLabel } from './arReconStyle'

const PROFILE_TABS = [
  { id: 'temperature', label: 'Temperature' },
  { id: 'humidity', label: 'Humidity' },
  { id: 'wind', label: 'Wind' },
]

function pairedTrace(xValues, pressureValues, name, color) {
  const x = []
  const y = []
  pressureValues.forEach((pressure, index) => {
    const value = xValues?.[index]
    if (!Number.isFinite(value) || !Number.isFinite(pressure)) return
    x.push(value)
    y.push(pressure)
  })
  return {
    type: 'scatter',
    mode: 'lines',
    name,
    x,
    y,
    line: { color, width: 2.5 },
    hovertemplate: `${name}: %{x:.1f}<br>Pressure: %{y:.1f} hPa<extra></extra>`,
  }
}

function deriveWindSpeed(measurements) {
  if (measurements.windSpeedMps) return measurements.windSpeedMps
  const eastward = measurements.eastwardWindMps ?? []
  const northward = measurements.northwardWindMps ?? []
  return eastward.map((east, index) => {
    const north = northward[index]
    return Number.isFinite(east) && Number.isFinite(north)
      ? Math.hypot(east, north)
      : null
  })
}

function buildProfileDownloadFiles(flight, sonde) {
  const coordinates = sonde.coordinates ?? {}
  const measurements = sonde.measurements ?? {}
  const measurementColumns = Object.keys(measurements)
  const columns = [
    'timestampUtc',
    'timeOffsetSeconds',
    'longitude',
    'latitude',
    'altitudeMslMeters',
    ...measurementColumns,
  ]
  const rowCount = Math.max(
    coordinates.timeOffsetSeconds?.length ?? 0,
    coordinates.longitude?.length ?? 0,
    coordinates.latitude?.length ?? 0,
    coordinates.altitudeMslMeters?.length ?? 0,
    ...measurementColumns.map((column) => measurements[column]?.length ?? 0),
  )
  const originTime = flight.originTime ? new Date(flight.originTime) : null
  const hasValidOriginTime = originTime && !Number.isNaN(originTime.getTime())
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const timeOffsetSeconds = coordinates.timeOffsetSeconds?.[index]
    const timestampUtc = hasValidOriginTime && Number.isFinite(timeOffsetSeconds)
      ? new Date(originTime.getTime() + (timeOffsetSeconds * 1000)).toISOString()
      : ''
    const row = {
      timestampUtc,
      timeOffsetSeconds,
      longitude: coordinates.longitude?.[index],
      latitude: coordinates.latitude?.[index],
      altitudeMslMeters: coordinates.altitudeMslMeters?.[index],
    }
    measurementColumns.forEach((column) => {
      row[column] = measurements[column]?.[index]
    })
    return row
  })

  return buildGeneratedCsvDownloadFiles({
    plotDefinition: {
      id: 'dropsonde-profile',
      csvDownload: { enabled: true },
    },
    station: sonde,
    popupState: null,
    plotState: null,
    sourceId: 'profile',
    columns,
    rows,
    defaultFileName: `${flight.id}_${sonde.id}_dropsonde_profile.csv`,
  })
}

function escapePlotlyText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildProfilePlot(flight, sonde, activeTabId) {
  const measurements = sonde.measurements ?? {}
  const pressure = measurements.pressureHpa ?? []
  let traces = []
  let xTitle = ''

  if (activeTabId === 'temperature') {
    traces = [
      pairedTrace(measurements.temperatureC, pressure, 'Temperature (°C)', '#d73027'),
      pairedTrace(measurements.dewPointC, pressure, 'Dew point (°C)', '#2878b5'),
    ]
    xTitle = 'Temperature (°C)'
  } else if (activeTabId === 'humidity') {
    traces = [pairedTrace(
      measurements.relativeHumidityPercent,
      pressure,
      'Relative humidity (%)',
      '#16896b',
    )]
    xTitle = 'Relative humidity (%)'
  } else {
    traces = [pairedTrace(deriveWindSpeed(measurements), pressure, 'Wind speed (m/s)', '#6a3d9a')]
    xTitle = 'Wind speed (m/s)'
  }

  traces = traces.filter((trace) => trace.x.length)
  const launchTime = sonde.launchTime
    ? new Date(sonde.launchTime).toISOString().replace('.000Z', 'Z')
    : ''
  const title = `${getArReconFlightLabel(flight)} · Sonde ${sonde.id}`
  return {
    plotId: activeTabId,
    traceFingerprint: traces.map((trace) => `${trace.name}-${trace.x.length}`).join('|'),
    titleText: [
      `<span style="font-size:12px;font-weight:400">${escapePlotlyText(title)}</span>`,
      launchTime
        ? `<span style="font-size:11px;color:#567080">Launched ${escapePlotlyText(launchTime)}</span>`
        : '',
    ].filter(Boolean).join('<br>'),
    traces,
    hovermode: 'y unified',
    xAxisLayout: { title: xTitle, zeroline: false },
    yAxesLayout: {
      yaxis: {
        title: 'Pressure (hPa)',
        autorange: 'reversed',
        automargin: true,
      },
    },
    layout: {
      height: 380,
      margin: { l: 62, r: 22, t: 44, b: 34 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      legend: {
        orientation: 'v',
        x: 0.02,
        xanchor: 'left',
        y: 0.02,
        yanchor: 'bottom',
        bgcolor: 'rgba(255,255,255,0.78)',
        bordercolor: 'rgba(74,113,137,0.22)',
        borderwidth: 1,
      },
    },
    plotlyConfig: {
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    },
  }
}

export default function ArReconSondePopup({ selectedSonde, onChangeTab, onClose }) {
  const requestedTabId = selectedSonde.popup?.activeTabId
  const activeTabId = PROFILE_TABS.some((tab) => tab.id === requestedTabId)
    ? requestedTabId
    : PROFILE_TABS[0].id
  const { flight, sonde, longitude, latitude } = selectedSonde
  const plotState = useMemo(
    () => buildProfilePlot(flight, sonde, activeTabId),
    [activeTabId, flight, sonde],
  )
  const downloadFiles = useMemo(
    () => buildProfileDownloadFiles(flight, sonde),
    [flight, sonde],
  )

  async function handleDownload() {
    try {
      await downloadCsvFiles(downloadFiles)
    } catch (error) {
      console.error('Failed to download the dropsonde profile CSV.', error)
    }
  }

  return (
    <Popup
      anchor="top"
      className="ar-recon-sonde-profile-popup"
      closeButton
      closeOnClick={false}
      latitude={latitude}
      longitude={longitude}
      maxWidth="500px"
      onClose={onClose}
    >
      <div className="station-popup station-popup--timeseries ar-recon-sonde-popup">
        <div className="station-popup__header-row">
          <div className="station-popup__tabs" role="tablist" aria-label="Dropsonde profile variables">
            {PROFILE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTabId === tab.id}
                className={activeTabId === tab.id ? 'station-popup__tab is-active' : 'station-popup__tab'}
                onClick={() => onChangeTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <PopupCsvDownloadButton
            disabled={!downloadFiles.length}
            onClick={handleDownload}
            title="Download dropsonde profile CSV"
          />
        </div>
        {plotState.traces.length ? (
          <div className="station-popup__plot ar-recon-sonde-popup__plot">
            <TimeSeriesPlot
              stationName={sonde.id}
              stationId={`${flight.id}-${sonde.id}`}
              plotState={plotState}
            />
          </div>
        ) : (
          <p className="station-popup__status">No {activeTabId} profile is available for this sonde.</p>
        )}
      </div>
    </Popup>
  )
}

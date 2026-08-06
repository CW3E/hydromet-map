import { fetchAndParseCsv } from '../../lib/csvData'
import { buildRawSourceDownloadFiles } from '../../lib/csvExport'
import {
  CW3E_MET_OBS_POPUP_TABS,
  getCw3eMetObsPopupTabDefinition,
  getDefaultCw3eMetObsPopupTabId,
} from './cw3eMetObsPopupConfig'

function createEmptyPlotState(plotDefinition) {
  return {
    plotId: plotDefinition.id,
    status: 'idle',
    error: null,
    traces: [],
    titleText: null,
    layout: plotDefinition.layout ?? {},
    plotlyConfig: plotDefinition.plotlyConfig ?? {},
    xField: null,
    xAxisLayout: plotDefinition.xAxis ?? {},
    yAxesLayout: {},
    hovermode: plotDefinition.hovermode ?? 'closest',
    traceFingerprint: 'empty',
    downloadFiles: [],
  }
}

function createEmptyTabDataById() {
  return Object.fromEntries(
    CW3E_MET_OBS_POPUP_TABS.map((tab) => [
      tab.id,
      {
        plotsById: Object.fromEntries(
          tab.plots.map((plot) => [plot.id, createEmptyPlotState(plot)]),
        ),
      },
    ]),
  )
}

function normalizeAxisTitle(title) {
  return typeof title === 'string' ? { text: title } : title
}

function buildYAxisLayout(plotDefinition, traces) {
  const usedAxes = new Set(traces.map((trace) => trace.yaxis ?? 'y'))

  return Object.fromEntries(
    Object.entries(plotDefinition.axes ?? {})
      .filter(([axisId]) => usedAxes.has(axisId))
      .map(([axisId, config]) => [
        axisId === 'y' ? 'yaxis' : `yaxis${axisId.slice(1)}`,
        {
          automargin: true,
          ...config,
          ...(config.title ? { title: normalizeAxisTitle(config.title) } : {}),
        },
      ]),
  )
}

function buildTrace(seriesKey, seriesConfig, sourceRecord) {
  const xValues = sourceRecord.rows.map((row, index) => row[seriesConfig.xField] ?? index)
  const yValues = sourceRecord.rows.map((row) => {
    const value = row[seriesConfig.column ?? seriesKey]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  })

  if (!yValues.some((value) => value != null)) {
    return null
  }

  return {
    type: seriesConfig.type ?? 'scatter',
    name: seriesConfig.label ?? seriesKey,
    x: xValues,
    y: yValues,
    ...(seriesConfig.marker ? { marker: seriesConfig.marker } : {}),
  }
}

async function fetchPlotSource(sourceDefinition, station) {
  const url = sourceDefinition.buildUrl({ stationId: station.id, station })

  try {
    const { rows, fields } = await fetchAndParseCsv(url, { dynamicTyping: true })
    return { id: sourceDefinition.id, url, rows, fields }
  } catch (error) {
    if (error instanceof Error && /:\s*404\s/.test(error.message)) {
      return { id: sourceDefinition.id, url, rows: [], fields: [] }
    }
    throw error
  }
}

async function buildPlotState(plotDefinition, station) {
  const sourceEntries = await Promise.all(
    plotDefinition.sources.map(async (sourceDefinition) => {
      const sourceRecord = await fetchPlotSource(sourceDefinition, station)
      return [sourceDefinition.id, sourceRecord]
    }),
  )
  const sourceRecords = Object.fromEntries(sourceEntries)
  const traces = Object.entries(plotDefinition.series)
    .map(([seriesKey, seriesConfig]) =>
      buildTrace(seriesKey, seriesConfig, sourceRecords[seriesConfig.sourceId]),
    )
    .filter(Boolean)
  const titleText = plotDefinition.titleTemplate
    .replaceAll('{stationName}', station.name ?? '')
    .replaceAll('{stationId}', station.id ?? '')

  return {
    plotId: plotDefinition.id,
    status: 'ready',
    error: null,
    traces,
    titleText,
    layout: plotDefinition.layout,
    plotlyConfig: plotDefinition.plotlyConfig,
    xField: 'timestamp',
    xAxisLayout: plotDefinition.xAxis,
    yAxesLayout: buildYAxisLayout(plotDefinition, traces),
    hovermode: plotDefinition.hovermode,
    traceFingerprint: traces.length ? traces.map((trace) => `${trace.type}:${trace.name}`).join('|') : 'empty',
    downloadFiles: traces.length
      ? buildRawSourceDownloadFiles({
          plotDefinition,
          station,
          popupState: station.popup,
          plotState: null,
          sourceRecords,
        })
      : [],
  }
}

export function createSelectedCw3eMetObsPopupState(feature, coordinates = {}) {
  const properties = feature?.properties ?? {}

  return {
    popupType: 'cw3e-met-obs',
    popupOwnerId: 'cw3eMetObs',
    layerId: 'cw3eMetObs',
    id: properties.ID ?? 'Unknown',
    name: properties['Station Name'] ?? properties.ID ?? 'Unknown',
    riverBasin: properties['River Basin'] ?? null,
    county: properties.County ?? null,
    elevationFeet: properties.ElevationFeet ?? null,
    longitude: coordinates.longitude ?? feature.geometry.coordinates[0],
    latitude: coordinates.latitude ?? feature.geometry.coordinates[1],
    popup: {
      activeTabId: getDefaultCw3eMetObsPopupTabId(),
      tabDataById: createEmptyTabDataById(),
    },
  }
}

export function setActiveCw3eMetObsPopupTab(setSelectedStation, tabId) {
  setSelectedStation((current) => current ? {
    ...current,
    popup: { ...current.popup, activeTabId: tabId },
  } : current)
  window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
}

export function loadCw3eMetObsPopupTabData(setSelectedStation, station, tabId) {
  const tabDefinition = getCw3eMetObsPopupTabDefinition(tabId)
  if (!tabDefinition) return

  setSelectedStation((current) => {
    if (current?.popupOwnerId !== station.popupOwnerId || current?.id !== station.id) return current
    const currentTab = current.popup?.tabDataById?.[tabId]
    const statuses = tabDefinition.plots.map((plot) => currentTab?.plotsById?.[plot.id]?.status)
    if (statuses.every((status) => status === 'ready') || statuses.some((status) => status === 'loading')) {
      return current
    }
    return {
      ...current,
      popup: {
        ...current.popup,
        tabDataById: {
          ...current.popup.tabDataById,
          [tabId]: {
            plotsById: Object.fromEntries(tabDefinition.plots.map((plot) => [
              plot.id,
              { ...(currentTab?.plotsById?.[plot.id] ?? createEmptyPlotState(plot)), status: 'loading', error: null },
            ])),
          },
        },
      },
    }
  })

  Promise.all(tabDefinition.plots.map(async (plot) => [plot.id, await buildPlotState(plot, station)]))
    .then((entries) => {
      setSelectedStation((current) => current?.popupOwnerId === station.popupOwnerId && current?.id === station.id ? {
        ...current,
        popup: {
          ...current.popup,
          tabDataById: {
            ...current.popup.tabDataById,
            [tabId]: { plotsById: Object.fromEntries(entries) },
          },
        },
      } : current)
    })
    .catch((error) => {
      setSelectedStation((current) => current?.popupOwnerId === station.popupOwnerId && current?.id === station.id ? {
        ...current,
        popup: {
          ...current.popup,
          tabDataById: {
            ...current.popup.tabDataById,
            [tabId]: {
              plotsById: Object.fromEntries(tabDefinition.plots.map((plot) => [plot.id, {
                ...(current.popup?.tabDataById?.[tabId]?.plotsById?.[plot.id] ?? createEmptyPlotState(plot)),
                status: 'error',
                error: error instanceof Error ? error.message : 'Failed to load observation data.',
              }])),
            },
          },
        },
      } : current)
    })
}

import { fetchAndParseCsv } from '../../lib/csvData'
import { buildRawSourceDownloadFiles } from '../../lib/csvExport'
import {
  CW3E_MET_OBS_POPUP_TABS,
  getCw3eMetObsPopupTabDefinition,
  getDefaultCw3eMetObsPopupTabId,
} from './cw3eMetObsPopupConfig'

const MISSING_VALUE_SENTINELS = new Set([-99.99])
const SOIL_OR_SNOW_COLUMN_PATTERN = /^(?:soil_(?:moisture|temperature)_\d+(?:p\d+)?cm_(?:pct|c)|snow_depth_m)$/

function isUsableNumber(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && !MISSING_VALUE_SENTINELS.has(value)
}

function meetsMinimumValue(value, minimumValue) {
  return minimumValue == null || value >= minimumValue
}

function isUsableSoilOrSnowValue(field, value) {
  const minimumValue = field.startsWith('soil_temperature_') ? -100 : null
  return isUsableNumber(value) && meetsMinimumValue(value, minimumValue)
}

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
      .map(([axisId, config]) => {
        const normalizedConfig = {
          automargin: true,
          ...config,
          ...(config.title ? { title: normalizeAxisTitle(config.title) } : {}),
        }

        if (axisId !== 'y' && normalizedConfig.overlaying === 'y') {
          normalizedConfig.anchor = normalizedConfig.anchor ?? 'free'
          normalizedConfig.autoshift = normalizedConfig.autoshift ?? true
        }

        return [
          axisId === 'y' ? 'yaxis' : `yaxis${axisId.slice(1)}`,
          normalizedConfig,
        ]
      }),
  )
}

function buildTrace(seriesKey, seriesConfig, sourceRecord) {
  const xValues = sourceRecord.rows.map((row, index) => row[seriesConfig.xField] ?? index)
  const yValues = sourceRecord.rows.map((row) => {
    const value = row[seriesConfig.column ?? seriesKey]
    return isUsableNumber(value) && meetsMinimumValue(value, seriesConfig.minimumValue)
      ? value
      : null
  })

  if (!yValues.some((value) => value != null)) {
    return null
  }

  const trace = {
    type: seriesConfig.type ?? 'scatter',
    name: seriesConfig.label ?? seriesKey,
    x: xValues,
    y: yValues,
    ...(seriesConfig.marker ? { marker: seriesConfig.marker } : {}),
    ...(seriesConfig.visible ? { visible: seriesConfig.visible } : {}),
  }

  if (seriesConfig.yAxis && seriesConfig.yAxis !== 'y') {
    trace.yaxis = seriesConfig.yAxis
  }

  if (trace.type !== 'bar') {
    trace.mode = seriesConfig.mode ?? 'lines'
    trace.connectgaps = false
    trace.line = { width: 2, ...(seriesConfig.line ?? {}) }
  }

  return trace
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
  const generatedSeries = typeof plotDefinition.buildSeries === 'function'
    ? (plotDefinition.buildSeries({ sourceRecords, station }) ?? {})
    : {}
  const seriesDefinitions = {
    ...generatedSeries,
    ...(plotDefinition.series ?? {}),
  }
  const traces = Object.entries(seriesDefinitions)
    .map(([seriesKey, seriesConfig]) =>
      buildTrace(seriesKey, seriesConfig, sourceRecords[seriesConfig.sourceId]),
    )
    .filter(Boolean)
  const hasSoilOrSnowData = Object.values(sourceRecords).some((sourceRecord) =>
    sourceRecord.fields.some((field) =>
      SOIL_OR_SNOW_COLUMN_PATTERN.test(field)
      && sourceRecord.rows.some((row) => isUsableSoilOrSnowValue(field, row[field])),
    ),
  )
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
    hasSoilOrSnowData,
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
      const hasSoilOrSnowData = entries.some(([, plotState]) => plotState.hasSoilOrSnowData)
      setSelectedStation((current) => current?.popupOwnerId === station.popupOwnerId && current?.id === station.id ? {
        ...current,
        popup: {
          ...current.popup,
          hasSoilOrSnowData,
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

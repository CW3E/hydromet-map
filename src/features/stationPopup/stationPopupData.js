import { fetchAndParseCsv } from '../../lib/csvData'
import {
  DEFAULT_STATION_POPUP_FORECAST_PRODUCT,
  STATION_POPUP_TABS,
  getDefaultStationPopupTabId,
  getStationPopupForecastProductLabel,
  getStationPopupTabDefinition,
} from './stationPopupConfig'

function findTimeAxisField(fields) {
  const preferredField = fields.find((field) => /^(date|time|datetime|timestamp)$/i.test(field))
  return preferredField ?? fields[0] ?? null
}

function transformSeriesValue(rawValue, seriesConfig) {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return null
  }

  const scaleFactor = seriesConfig.scaleFactor ?? 1
  const offset = seriesConfig.offset ?? 0
  const transformedValue = rawValue * scaleFactor + offset

  return Number.isFinite(transformedValue) ? transformedValue : null
}

function normalizeAxisTitle(title) {
  if (!title) {
    return undefined
  }

  if (typeof title === 'string') {
    return { text: title }
  }

  return title
}

function normalizeAxisConfig(axisId, axisConfig) {
  const normalizedConfig = {
    automargin: true,
    ...axisConfig,
  }

  const normalizedTitle = normalizeAxisTitle(normalizedConfig.title)

  if (normalizedTitle) {
    normalizedConfig.title = normalizedTitle
  }

  if (axisId !== 'y' && normalizedConfig.overlaying === 'y') {
    normalizedConfig.anchor = normalizedConfig.anchor ?? 'free'
    normalizedConfig.autoshift = normalizedConfig.autoshift ?? true
  }

  return normalizedConfig
}

function buildYAxisLayout(plotDefinition, traces) {
  const usedAxes = new Set(traces.map((trace) => trace.yaxis ?? 'y'))
  const configuredAxes = plotDefinition.axes ?? {}
  const yAxesLayout = {}
  let leftAxisCount = 1
  let rightAxisCount = 0

  Object.entries(configuredAxes).forEach(([axisId, axisConfig]) => {
    if (!usedAxes.has(axisId)) {
      return
    }

    const layoutKey = axisId === 'y' ? 'yaxis' : `yaxis${axisId.slice(1)}`
    const normalizedConfig = normalizeAxisConfig(axisId, axisConfig)

    if (axisId !== 'y' && normalizedConfig.side === 'left') {
      leftAxisCount += 1
    }

    if (normalizedConfig.side === 'right') {
      rightAxisCount += 1
    }

    yAxesLayout[layoutKey] = normalizedConfig
  })

  if (!yAxesLayout.yaxis) {
    yAxesLayout.yaxis = {
      automargin: true,
      title: { text: 'Value' },
    }
  }

  return {
    yAxesLayout,
    leftAxisCount,
    rightAxisCount,
  }
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
    yAxesLayout: {
      yaxis: {
        automargin: true,
        title: { text: 'Value' },
      },
    },
    leftAxisCount: 1,
    rightAxisCount: 0,
    hovermode: plotDefinition.hovermode ?? 'closest',
    traceFingerprint: 'empty',
    sources: {},
  }
}

function resolvePlotTitleText(plotDefinition, station) {
  const template = plotDefinition.titleTemplate

  if (!template) {
    return `${station.name} (${station.id})`
  }

  const forecastProductLabel = getStationPopupForecastProductLabel(
    station.popup?.forecastProduct ?? DEFAULT_STATION_POPUP_FORECAST_PRODUCT,
  )

  return template
    .replaceAll('{stationName}', station.name ?? '')
    .replaceAll('{stationId}', station.id ?? '')
    .replaceAll('{forecastProduct}', forecastProductLabel)
}

function createEmptyTabState(tabDefinition) {
  return {
    plotsById: Object.fromEntries(
      tabDefinition.plots.map((plotDefinition) => [plotDefinition.id, createEmptyPlotState(plotDefinition)]),
    ),
  }
}

function createEmptyTabDataById() {
  return Object.fromEntries(
    STATION_POPUP_TABS.map((tabDefinition) => [tabDefinition.id, createEmptyTabState(tabDefinition)]),
  )
}

function getSourceRecord(sourceRecords, sourceId, fieldName) {
  const resolvedSourceId = sourceId ?? Object.keys(sourceRecords)[0]

  if (!resolvedSourceId || !sourceRecords[resolvedSourceId]) {
    throw new Error(`Missing data source for series "${fieldName}".`)
  }

  return sourceRecords[resolvedSourceId]
}

function buildTrace(seriesKey, seriesConfig, sourceRecord) {
  const columnName = seriesConfig.column ?? seriesKey
  const xField = seriesConfig.xField ?? sourceRecord.xField
  const xValues = xField
    ? sourceRecord.rows.map((row, index) => row[xField] ?? index)
    : sourceRecord.rows.map((_, index) => index)
  const yValues = sourceRecord.rows.map((row) => transformSeriesValue(row[columnName], seriesConfig))

  if (!yValues.some((value) => typeof value === 'number' && Number.isFinite(value))) {
    return null
  }

  const axisId = seriesConfig.yAxis ?? 'y'
  const traceType = seriesConfig.type ?? 'scatter'
  const trace = {
    type: traceType,
    name: seriesConfig.label ?? seriesKey,
    x: xValues,
    y: yValues,
  }

  if (axisId !== 'y') {
    trace.yaxis = axisId
  }

  if (traceType === 'bar') {
    if (seriesConfig.marker) {
      trace.marker = seriesConfig.marker
    }

    return trace
  }

  trace.mode = seriesConfig.mode ?? 'lines'
  trace.connectgaps = false
  trace.line = {
    width: 2,
    ...seriesConfig.line,
  }

  if (seriesConfig.marker) {
    trace.marker = seriesConfig.marker
  }

  return trace
}

async function fetchPlotSources(plotDefinition, station) {
  const sourceEntries = await Promise.all(
    (plotDefinition.sources ?? []).map(async (sourceDefinition) => {
      const url = sourceDefinition.buildUrl({
        stationId: station.id,
        station,
        popupState: station.popup,
      })
      const { rows, fields } = await fetchAndParseCsv(url, { dynamicTyping: true })

      return [
        sourceDefinition.id,
        {
          id: sourceDefinition.id,
          url,
          rows,
          fields,
          xField: findTimeAxisField(fields),
        },
      ]
    }),
  )

  return Object.fromEntries(sourceEntries)
}

async function buildTimeSeriesPlotState(plotDefinition, station) {
  const sourceRecords = await fetchPlotSources(plotDefinition, station)
  const traces = Object.entries(plotDefinition.series ?? {})
    .filter(([, seriesConfig]) => seriesConfig.visible ?? true)
    .map(([seriesKey, seriesConfig]) => {
      const sourceRecord = getSourceRecord(sourceRecords, seriesConfig.sourceId, seriesKey)
      return buildTrace(seriesKey, seriesConfig, sourceRecord)
    })
    .filter(Boolean)

  if (traces.length === 0) {
    throw new Error('No numeric time-series columns were found in the configured CSV source.')
  }

  const primarySource = sourceRecords[Object.keys(sourceRecords)[0]]
  const { yAxesLayout, leftAxisCount, rightAxisCount } = buildYAxisLayout(plotDefinition, traces)

  return {
    plotId: plotDefinition.id,
    status: 'ready',
    error: null,
    traces,
    titleText: resolvePlotTitleText(plotDefinition, station),
    layout: plotDefinition.layout ?? {},
    plotlyConfig: plotDefinition.plotlyConfig ?? {},
    xField: primarySource?.xField ?? null,
    xAxisLayout: plotDefinition.xAxis ?? {},
    yAxesLayout,
    leftAxisCount,
    rightAxisCount,
    hovermode: plotDefinition.hovermode ?? 'closest',
    traceFingerprint: traces.map((trace) => `${trace.type}:${trace.name}:${trace.yaxis ?? 'y'}`).join('|'),
    sources: Object.fromEntries(
      Object.entries(sourceRecords).map(([sourceId, sourceRecord]) => [
        sourceId,
        {
          url: sourceRecord.url,
          fields: sourceRecord.fields,
        },
      ]),
    ),
  }
}

async function buildPlotState(plotDefinition, station) {
  if (plotDefinition.type === 'timeseries') {
    return buildTimeSeriesPlotState(plotDefinition, station)
  }

  throw new Error(`Unsupported plot type "${plotDefinition.type}".`)
}

function buildLoadingTabState(tabDefinition, currentTabState) {
  return {
    plotsById: Object.fromEntries(
      tabDefinition.plots.map((plotDefinition) => {
        const currentPlotState = currentTabState?.plotsById?.[plotDefinition.id] ?? createEmptyPlotState(plotDefinition)

        return [
          plotDefinition.id,
          {
            ...currentPlotState,
            status: currentPlotState.status === 'ready' ? 'ready' : 'loading',
            error: null,
          },
        ]
      }),
    ),
  }
}

function triggerPlotResize() {
  window.requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

export function createInitialStationPopupState() {
  return {
    activeTabId: getDefaultStationPopupTabId(),
    forecastProduct: DEFAULT_STATION_POPUP_FORECAST_PRODUCT,
    tabDataById: createEmptyTabDataById(),
  }
}

export function createSelectedStationPopupState(feature) {
  return {
    id: feature.properties.ID,
    name: feature.properties.Location,
    river: feature.properties.River,
    reachId: feature.properties.ReachID,
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
    popup: createInitialStationPopupState(),
  }
}

export function setActiveStationPopupTab(setSelectedStation, tabId) {
  setSelectedStation((current) =>
    current
      ? {
          ...current,
          popup: {
            ...current.popup,
            activeTabId: tabId,
          },
        }
      : current,
  )

  triggerPlotResize()
}

export function setStationPopupForecastProduct(setSelectedStation, productId) {
  setSelectedStation((current) =>
    current
      ? {
          ...current,
          popup: {
            ...current.popup,
            forecastProduct: productId,
            tabDataById: createEmptyTabDataById(),
          },
        }
      : current,
  )
}

export function loadStationPopupTabData(setSelectedStation, station, tabId) {
  const tabDefinition = getStationPopupTabDefinition(tabId)

  if (!tabDefinition) {
    return
  }

  setSelectedStation((current) => {
    if (!current || current.id !== station.id) {
      return current
    }

    const currentTabState = current.popup?.tabDataById?.[tabId]
    const isEveryPlotReady = tabDefinition.plots.every(
      (plotDefinition) => currentTabState?.plotsById?.[plotDefinition.id]?.status === 'ready',
    )
    const isAnyPlotLoading = tabDefinition.plots.some(
      (plotDefinition) => currentTabState?.plotsById?.[plotDefinition.id]?.status === 'loading',
    )

    if (isEveryPlotReady || isAnyPlotLoading) {
      return current
    }

    return {
      ...current,
      popup: {
        ...current.popup,
        tabDataById: {
          ...current.popup.tabDataById,
          [tabId]: buildLoadingTabState(tabDefinition, currentTabState),
        },
      },
    }
  })

  Promise.all(
    tabDefinition.plots.map(async (plotDefinition) => [
      plotDefinition.id,
      await buildPlotState(plotDefinition, station),
    ]),
  )
    .then((plotEntries) => {
      setSelectedStation((current) =>
        current?.id === station.id
          ? {
              ...current,
              popup: {
                ...current.popup,
                tabDataById: {
                  ...current.popup.tabDataById,
                  [tabId]: {
                    plotsById: Object.fromEntries(plotEntries),
                  },
                },
              },
            }
          : current,
      )
    })
    .catch((error) => {
      setSelectedStation((current) =>
        current?.id === station.id
          ? {
              ...current,
              popup: {
                ...current.popup,
                tabDataById: {
                  ...current.popup.tabDataById,
                  [tabId]: {
                    plotsById: Object.fromEntries(
                      tabDefinition.plots.map((plotDefinition) => [
                        plotDefinition.id,
                        {
                          ...(current.popup?.tabDataById?.[tabId]?.plotsById?.[plotDefinition.id] ??
                            createEmptyPlotState(plotDefinition)),
                          status: 'error',
                          error:
                            error instanceof Error ? error.message : 'Failed to load plot data.',
                        },
                      ]),
                    ),
                  },
                },
              },
            }
          : current,
      )
    })
}

export function getStationPopupTabs() {
  return STATION_POPUP_TABS
}

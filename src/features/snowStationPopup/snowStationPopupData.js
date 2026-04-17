import { fetchAndParseCsv } from '../../lib/csvData'
import {
  getDefaultSnowPopupTabId,
  getSnowPopupTabDefinition,
  getSnowPopupTabs,
} from './snowStationPopupConfig'

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

function resolvePlotTitleText(plotDefinition, station, tabDefinition) {
  const template = plotDefinition.titleTemplate

  if (!template) {
    return `${station.name} (${station.id})`
  }

  return template
    .replaceAll('{stationName}', station.name ?? '')
    .replaceAll('{stationId}', station.id ?? '')
    .replaceAll('{elevation}', station.elevation ?? '')
    .replaceAll('{basinName}', station.basinName ?? '')
    .replaceAll('{hydroArea}', station.hydroArea ?? '')
    .replaceAll('{tabLabel}', tabDefinition?.label ?? '')
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
    xAxisLayout: {},
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

function createEmptyTabState(tabDefinition) {
  return {
    plotsById: Object.fromEntries(
      tabDefinition.plots.map((plotDefinition) => [plotDefinition.id, createEmptyPlotState(plotDefinition)]),
    ),
  }
}

function createEmptyTabDataById(popupDefinition) {
  return Object.fromEntries(
    getSnowPopupTabs(popupDefinition).map((tabDefinition) => [tabDefinition.id, createEmptyTabState(tabDefinition)]),
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
  if (seriesConfig.fill) {
    trace.fill = seriesConfig.fill
  }

  if (seriesConfig.fillcolor) {
    trace.fillcolor = seriesConfig.fillcolor
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
      const transformedRows =
        typeof sourceDefinition.transformRows === 'function'
          ? (sourceDefinition.transformRows({
              rows,
              fields,
              station,
              popupState: station.popup,
            }) ?? rows)
          : rows
      const transformedFields = Array.from(
        new Set([
          ...fields,
          ...transformedRows.flatMap((row) => Object.keys(row ?? {})),
        ]),
      )

      return [
        sourceDefinition.id,
        {
          id: sourceDefinition.id,
          url,
          rows: transformedRows,
          fields: transformedFields,
          xField: findTimeAxisField(transformedFields),
        },
      ]
    }),
  )

  return Object.fromEntries(sourceEntries)
}

function buildXAxisLayout(plotDefinition, station) {
  if (typeof plotDefinition.xAxis === 'function') {
    return plotDefinition.xAxis({
      station,
      popupState: station.popup,
    }) ?? {}
  }

  return plotDefinition.xAxis ?? {}
}

async function buildTimeSeriesPlotState(plotDefinition, station, tabDefinition) {
  const sourceRecords = await fetchPlotSources(plotDefinition, station)
  const xAxisLayout = buildXAxisLayout(plotDefinition, station)
  const generatedSeries =
    typeof plotDefinition.buildSeries === 'function'
      ? (plotDefinition.buildSeries({
          sourceRecords,
          station,
          popupState: station.popup,
        }) ?? {})
      : {}
  const allSeries = {
    ...generatedSeries,
    ...(plotDefinition.series ?? {}),
  }
  const traces = Object.entries(allSeries)
    .filter(([, seriesConfig]) => seriesConfig.visible ?? true)
    .map(([seriesKey, seriesConfig]) => {
      const sourceRecord = getSourceRecord(sourceRecords, seriesConfig.sourceId, seriesKey)
      return buildTrace(seriesKey, seriesConfig, sourceRecord)
    })
    .filter(Boolean)

  const primarySource = sourceRecords[Object.keys(sourceRecords)[0]]
  const { yAxesLayout, leftAxisCount, rightAxisCount } = buildYAxisLayout(plotDefinition, traces)

  return {
    plotId: plotDefinition.id,
    status: 'ready',
    error: null,
    traces,
    titleText: resolvePlotTitleText(plotDefinition, station, tabDefinition),
    layout: plotDefinition.layout ?? {},
    plotlyConfig: plotDefinition.plotlyConfig ?? {},
    xField: primarySource?.xField ?? null,
    xAxisLayout,
    yAxesLayout,
    leftAxisCount,
    rightAxisCount,
    hovermode: plotDefinition.hovermode ?? 'closest',
    traceFingerprint:
      traces.length > 0
        ? traces.map((trace) => `${trace.type}:${trace.name}:${trace.yaxis ?? 'y'}`).join('|')
        : 'empty',
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

async function buildPlotState(plotDefinition, station, tabDefinition) {
  if (plotDefinition.type === 'timeseries') {
    return buildTimeSeriesPlotState(plotDefinition, station, tabDefinition)
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

export function createInitialSnowStationPopupState(popupDefinition) {
  return {
    activeTabId: getDefaultSnowPopupTabId(popupDefinition),
    tabDataById: createEmptyTabDataById(popupDefinition),
  }
}

export function createSelectedSnowStationPopupState(
  feature,
  popupDefinition,
  initialPopupState = {},
) {
  const properties = feature?.properties ?? {}

  return {
    popupType: popupDefinition.popupType,
    id: properties.STA ?? 'Unknown',
    name: properties.StationName ?? properties.STA ?? 'Unknown',
    elevation: properties.Elevation ?? null,
    basinName: properties.BasinName ?? null,
    hydroArea: properties.HydroArea ?? null,
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
    popup: {
      ...createInitialSnowStationPopupState(popupDefinition),
      ...initialPopupState,
    },
  }
}

export function setActiveSnowStationPopupTab(setSelectedStation, tabId) {
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

export function loadSnowStationPopupTabData(setSelectedStation, station, popupDefinition, tabId) {
  const tabDefinition = getSnowPopupTabDefinition(popupDefinition, tabId)

  if (!tabDefinition) {
    return
  }

  setSelectedStation((current) => {
    if (!current || current.id !== station.id || current.popupType !== popupDefinition.popupType) {
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
      await buildPlotState(plotDefinition, station, tabDefinition),
    ]),
  )
    .then((plotEntries) => {
      setSelectedStation((current) =>
        current?.id === station.id && current.popupType === popupDefinition.popupType
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
        current?.id === station.id && current.popupType === popupDefinition.popupType
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

import { buildGeneratedCsvDownloadFiles } from '../../lib/csvExport'
import { loadConfiguredSources } from '../../lib/plotDataSources'
import {
  OCWD_WELL_POPUP_TABS,
  getDefaultOcwdWellPopupTabId,
  getOcwdWellPopupTabDefinition,
} from './ocwdWellPopupConfig'

function normalizeAxisTitle(title) {
  if (!title) {
    return undefined
  }

  if (typeof title === 'string') {
    return { text: title }
  }

  return title
}

function normalizeAxisConfig(axisConfig) {
  const normalizedConfig = {
    automargin: true,
    ...axisConfig,
  }
  const normalizedTitle = normalizeAxisTitle(normalizedConfig.title)

  if (normalizedTitle) {
    normalizedConfig.title = normalizedTitle
  }

  return normalizedConfig
}

function createEmptyPlotState(plotDefinition) {
  return {
    plotId: plotDefinition.id,
    plotType: plotDefinition.type ?? 'timeseries',
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
    downloadFiles: [],
  }
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
    OCWD_WELL_POPUP_TABS.map((tabDefinition) => [tabDefinition.id, createEmptyTabState(tabDefinition)]),
  )
}

function getSourceRecord(sourceRecords, sourceId, fieldName) {
  const resolvedSourceId = sourceId ?? Object.keys(sourceRecords)[0]

  if (!resolvedSourceId || !sourceRecords[resolvedSourceId]) {
    throw new Error(`Missing data source for series "${fieldName}".`)
  }

  return sourceRecords[resolvedSourceId]
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

  return {
    type: seriesConfig.type ?? 'scatter',
    name: seriesConfig.label ?? seriesKey,
    x: xValues,
    y: yValues,
    mode: seriesConfig.mode ?? 'lines',
    connectgaps: false,
    line: {
      width: 2,
      ...seriesConfig.line,
    },
    yaxis: seriesConfig.yAxis === 'y' ? undefined : seriesConfig.yAxis,
  }
}

function resolvePlotTitleText(plotDefinition, station) {
  if (typeof plotDefinition.titleText === 'function') {
    return plotDefinition.titleText({ station, popupState: station.popup }) ?? station.id
  }

  return plotDefinition.titleText ?? station.id
}

async function resolvePlotSources(plotDefinition, station) {
  if (typeof plotDefinition.sources === 'function') {
    return await plotDefinition.sources({
      station,
      popupState: station.popup,
    })
  }

  return plotDefinition.sources ?? []
}

function resolvePlotSeries(plotDefinition, station) {
  if (typeof plotDefinition.series === 'function') {
    return plotDefinition.series({
      station,
      popupState: station.popup,
    }) ?? {}
  }

  return plotDefinition.series ?? {}
}

async function buildTimeSeriesPlotState(plotDefinition, station) {
  const sourceDefinitions = await resolvePlotSources(plotDefinition, station)
  const sourceRecords = await loadConfiguredSources(sourceDefinitions, { station })
  const seriesDefinitions = resolvePlotSeries(plotDefinition, station)
  const traces = Object.entries(seriesDefinitions)
    .filter(([, seriesConfig]) => seriesConfig.visible ?? true)
    .map(([seriesKey, seriesConfig]) => {
      const sourceRecord = getSourceRecord(sourceRecords, seriesConfig.sourceId, seriesKey)
      return buildTrace(seriesKey, seriesConfig, sourceRecord)
    })
    .filter(Boolean)
  const primarySource = sourceRecords[Object.keys(sourceRecords)[0]]
  const yAxesLayout = {
    yaxis: normalizeAxisConfig(plotDefinition.axes?.y ?? { title: { text: 'Value' } }),
  }
  const downloadFiles =
    plotDefinition.csvDownload?.enabled
      ? Object.entries(sourceRecords).flatMap(([sourceId, sourceRecord]) =>
        buildGeneratedCsvDownloadFiles({
          plotDefinition,
          station,
          popupState: station.popup,
          plotState: null,
          sourceId,
          sourceUrl: sourceRecord.url,
          columns: sourceRecord.fields ?? [],
          rows: sourceRecord.rows ?? [],
          defaultFileName: `${plotDefinition.id}_${sourceId}.csv`,
        }),
      )
      : []

  return {
    plotId: plotDefinition.id,
    plotType: plotDefinition.type ?? 'timeseries',
    status: 'ready',
    error: null,
    traces,
    titleText: resolvePlotTitleText(plotDefinition, station),
    layout: plotDefinition.layout ?? {},
    plotlyConfig: plotDefinition.plotlyConfig ?? {},
    xField: primarySource?.xField ?? null,
    xAxisLayout: plotDefinition.xAxis ?? {},
    yAxesLayout,
    leftAxisCount: 1,
    rightAxisCount: 0,
    hovermode: plotDefinition.hovermode ?? 'closest',
    traceFingerprint: traces.map((trace) => `${trace.type}:${trace.name}:${trace.yaxis ?? 'y'}`).join('|'),
    sources: Object.fromEntries(
      Object.entries(sourceRecords).map(([sourceId, sourceRecord]) => [
        sourceId,
        {
          url: sourceRecord.url,
          fields: sourceRecord.fields,
          metadata: sourceRecord.metadata,
        },
      ]),
    ),
    downloadFiles,
  }
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

function createInitialOcwdWellPopupState() {
  return {
    activeTabId: getDefaultOcwdWellPopupTabId(),
    tabDataById: createEmptyTabDataById(),
  }
}

export function createSelectedOcwdWellPopupState(feature, {
  layerId,
  popupOwnerId,
  longitude,
  latitude,
}) {
  const properties = feature?.properties ?? {}
  const stationId = properties.STAID1 ?? 'Unknown'

  return {
    popupType: 'ocwd-well',
    popupOwnerId,
    layerId,
    id: stationId,
    stationId,
    stationName: properties.WELLNM ?? stationId,
    owner: properties.OWNERNM ?? '',
    user: properties.WELLUSENM ?? '',
    status: properties.STATUSNM ?? '',
    longitude,
    latitude,
    popup: createInitialOcwdWellPopupState(),
  }
}

export function setActiveOcwdWellPopupTab(setSelectedStation, tabId) {
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

export function loadOcwdWellPopupTabData(setSelectedStation, station, tabId) {
  const tabDefinition = getOcwdWellPopupTabDefinition(tabId)

  if (!tabDefinition) {
    return
  }

  setSelectedStation((current) => {
    if (!current || current.id !== station.id || current.popupOwnerId !== station.popupOwnerId) {
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
      await buildTimeSeriesPlotState(plotDefinition, station),
    ]),
  )
    .then((plotEntries) => {
      setSelectedStation((current) =>
        current?.id === station.id && current?.popupOwnerId === station.popupOwnerId
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
        current?.id === station.id && current?.popupOwnerId === station.popupOwnerId
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

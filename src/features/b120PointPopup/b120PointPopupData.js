import { fetchAndParseCsv } from '../../lib/csvData'
import {
  B120_POINT_POPUP_TABS,
  DEFAULT_B120_POINT_FORECAST_UPDATE_DATE,
  DEFAULT_B120_POINT_POST_PROCESSING,
  getB120PointPostProcessingLabel,
  getB120PointPopupTabDefinition,
  getDefaultB120PointPopupTabId,
} from './b120PointPopupConfig'

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
    footerText: plotDefinition.footerText ?? null,
  }
}

function resolvePlotTitleText(plotDefinition, station) {
  const template = plotDefinition.titleTemplate

  if (!template) {
    return `${station.stationId}`
  }

  const updateDate = station.popup?.forecastUpdateDate ?? DEFAULT_B120_POINT_FORECAST_UPDATE_DATE
  const postProcessingLabel = getB120PointPostProcessingLabel(
    station.popup?.forecastPostProcessing ?? DEFAULT_B120_POINT_POST_PROCESSING,
  )

  return template
    .replaceAll('{stationId}', station.stationId ?? '')
    .replaceAll('{basin}', station.basin ?? '')
    .replaceAll('{location}', station.location ?? '')
    .replaceAll('{updateDate}', updateDate)
    .replaceAll('{postProcessing}', postProcessingLabel)
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
    B120_POINT_POPUP_TABS.map((tabDefinition) => [tabDefinition.id, createEmptyTabState(tabDefinition)]),
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

  if (typeof seriesConfig.showlegend === 'boolean') {
    trace.showlegend = seriesConfig.showlegend
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
        stationId: station.stationId,
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

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to load JSON from ${url}.`)
  }

  return response.json()
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

async function buildTimeSeriesPlotState(plotDefinition, station) {
  const sourceRecords = await fetchPlotSources(plotDefinition, station)
  const xAxisLayout = buildXAxisLayout(plotDefinition, station)
  const traces = Object.entries(plotDefinition.series ?? {})
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
    plotType: plotDefinition.type ?? 'timeseries',
    plotHeight: plotDefinition.plotHeight ?? null,
    status: 'ready',
    error: null,
    traces,
    titleText: resolvePlotTitleText(plotDefinition, station),
    layout: plotDefinition.layout ?? {},
    plotlyConfig: plotDefinition.plotlyConfig ?? {},
    xField: primarySource?.xField ?? null,
    xAxisLayout,
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
    footerText: plotDefinition.footerText ?? null,
  }
}

function formatTableCellValue(value, formatter) {
  if (typeof formatter === 'function') {
    return formatter(value)
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

async function buildTablePlotState(plotDefinition, station) {
  const sourceRecords = await fetchPlotSources(plotDefinition, station)
  const sourceRecord = getSourceRecord(sourceRecords, plotDefinition.sourceId, plotDefinition.id)
  const rows = sourceRecord.rows ?? []
  const selectedRows =
    typeof plotDefinition.selectRows === 'function'
      ? (plotDefinition.selectRows({ rows, station, popupState: station.popup }) ?? [])
      : rows

  if (!selectedRows.length) {
    throw new Error('No table rows were found in the configured CSV source.')
  }

  const columns = plotDefinition.columns ?? []
  const headerValues = columns.map((column) => column.label ?? column.key)
  const cellValues = columns.map((column) =>
    selectedRows.map((row) => formatTableCellValue(row[column.key], column.format)),
  )

  return {
    plotId: plotDefinition.id,
    plotType: plotDefinition.type ?? 'table',
    plotHeight: plotDefinition.plotHeight ?? null,
    status: 'ready',
    error: null,
    traces: [
      {
        type: 'table',
        header: {
          values: headerValues,
          align: 'center',
          fill: { color: 'rgba(29, 105, 150, 0.12)' },
          line: { color: 'rgba(16,34,47,0.12)' },
          font: { size: 12, color: '#10222f' },
        },
        cells: {
          values: cellValues,
          align: 'center',
          fill: { color: '#ffffff' },
          line: { color: 'rgba(16,34,47,0.08)' },
          font: { size: 12, color: '#244050' },
          height: 28,
        },
      },
    ],
    titleText: resolvePlotTitleText(plotDefinition, station),
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
    traceFingerprint: `table:${headerValues.join('|')}:${selectedRows.length}`,
    sources: Object.fromEntries(
      Object.entries(sourceRecords).map(([sourceId, sourceRecordEntry]) => [
        sourceId,
        {
          url: sourceRecordEntry.url,
          fields: sourceRecordEntry.fields,
        },
      ]),
    ),
    footerText: plotDefinition.footerText ?? null,
  }
}

async function buildChoroplethMapPlotState(plotDefinition, station) {
  const geojson = await fetchJson(plotDefinition.basinGeoJsonUrl)
  const stationIds = plotDefinition.stationIds ?? []
  const forecastRows = await Promise.all(
    stationIds.map(async (stationId) => {
      const url = plotDefinition.buildStationUrl({
        stationId,
        station,
        popupState: station.popup,
      })
      const { rows } = await fetchAndParseCsv(url, { dynamicTyping: true })
      const lastRow = rows?.[rows.length - 1] ?? null
      return {
        stationId,
        lastRow,
      }
    }),
  )

  const values = forecastRows
    .map(({ stationId, lastRow }) => {
      const rawValue = lastRow?.[plotDefinition.valueKey]
      const numericValue =
        typeof rawValue === 'number' ? rawValue : Number.parseFloat(rawValue)

      if (!Number.isFinite(numericValue)) {
        return null
      }

      return {
        stationId,
        value: numericValue,
      }
    })
    .filter(Boolean)

  if (!values.length) {
    throw new Error(`No numeric values were found for "${plotDefinition.valueKey}".`)
  }

  return {
    plotId: plotDefinition.id,
    plotType: plotDefinition.type ?? 'choroplethmap',
    plotHeight: plotDefinition.plotHeight ?? null,
    status: 'ready',
    error: null,
    traces: [
      {
        type: 'choropleth',
        geojson,
        featureidkey: 'properties.ID',
        locations: values.map((entry) => entry.stationId),
        z: values.map((entry) => entry.value),
        colorscale: plotDefinition.colorscale ?? 'Viridis',
        reversescale: plotDefinition.reversescale ?? false,
        zmin: plotDefinition.zmin,
        zmax: plotDefinition.zmax,
        zmid: plotDefinition.zmid,
        marker: {
          line: {
            color: '#0b3b8f',
            width: 1,
          },
        },
        colorbar: {
          title: {
            text: plotDefinition.colorbarTitle ?? plotDefinition.valueLabel ?? plotDefinition.valueKey,
            side: 'right',
          },
        },
        customdata: values.map((entry) => [entry.stationId, entry.value]),
        hovertemplate: 'ID: %{customdata[0]}<br>'
          + `${plotDefinition.valueLabel ?? plotDefinition.valueKey}: %{z:.0f}<extra></extra>`,
      },
    ],
    titleText: resolvePlotTitleText(plotDefinition, station),
    layout: {
      ...(plotDefinition.layout ?? {}),
      geo: {
        fitbounds: 'locations',
        visible: false,
        showframe: false,
        showcoastlines: false,
        projection: { type: 'mercator' },
        bgcolor: 'rgba(0,0,0,0)',
      },
    },
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
    traceFingerprint: `choropleth:${plotDefinition.valueKey}:${values.length}:${plotDefinition.zmin ?? 'auto'}:${plotDefinition.zmax ?? 'auto'}:${plotDefinition.reversescale ? 'reversed' : 'normal'}:${JSON.stringify(plotDefinition.colorscale ?? 'Viridis')}`,
    sources: {
      basins: {
        url: plotDefinition.basinGeoJsonUrl,
        fields: ['ID'],
      },
    },
    footerText: plotDefinition.footerText ?? null,
  }
}

async function buildPlotState(plotDefinition, station) {
  if (plotDefinition.type === 'timeseries') {
    return buildTimeSeriesPlotState(plotDefinition, station)
  }

  if (plotDefinition.type === 'table') {
    return buildTablePlotState(plotDefinition, station)
  }

  if (plotDefinition.type === 'choroplethmap') {
    return buildChoroplethMapPlotState(plotDefinition, station)
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

export function createInitialB120PointPopupState() {
  return {
    activeTabId: getDefaultB120PointPopupTabId(),
    forecastUpdateDate: DEFAULT_B120_POINT_FORECAST_UPDATE_DATE,
    forecastPostProcessing: DEFAULT_B120_POINT_POST_PROCESSING,
    tabDataById: createEmptyTabDataById(),
  }
}

export function createSelectedB120PointPopupState(feature, initialPopupState = {}) {
  const properties = feature?.properties ?? {}

  return {
    popupType: 'b120-points',
    stationId: properties.Station_ID ?? 'Unknown',
    basin: properties.Basin ?? 'Unknown',
    location: properties.Location ?? 'Unknown',
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
    popup: {
      ...createInitialB120PointPopupState(),
      ...initialPopupState,
    },
  }
}

export function setActiveB120PointPopupTab(setSelectedStation, tabId) {
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

export function setB120PointForecastUpdateDate(setSelectedStation, forecastUpdateDate) {
  setSelectedStation((current) =>
    current
      ? {
          ...current,
          popup: {
            ...current.popup,
            forecastUpdateDate,
            tabDataById: createEmptyTabDataById(),
          },
        }
      : current,
  )
}

export function setB120PointForecastPostProcessing(setSelectedStation, forecastPostProcessing) {
  setSelectedStation((current) =>
    current
      ? {
          ...current,
          popup: {
            ...current.popup,
            forecastPostProcessing,
            tabDataById: createEmptyTabDataById(),
          },
        }
      : current,
  )
}

export function loadB120PointPopupTabData(setSelectedStation, station, tabId) {
  const tabDefinition = getB120PointPopupTabDefinition(tabId)

  if (!tabDefinition) {
    return
  }

  setSelectedStation((current) => {
    if (!current || current.stationId !== station.stationId) {
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
        current?.stationId === station.stationId
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
        current?.stationId === station.stationId
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

export function getB120PointPopupTabs() {
  return B120_POINT_POPUP_TABS
}

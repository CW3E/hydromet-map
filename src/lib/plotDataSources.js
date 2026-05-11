import { fetchAndParseCsv } from './csvData'
import {
  loadCnrfcPercentilesSource,
  loadCnrfcSeriesSource,
} from './cnrfcBinaryData'
import {
  loadGradesPercentilesSource,
  loadGradesSeriesSource,
} from './gradesBinaryData'
import { loadGshaSeriesSource } from './gshaBinaryData'

function findTimeAxisField(fields) {
  const preferredField = fields.find((field) => /^(date|time|datetime|timestamp)$/i.test(field))
  return preferredField ?? fields[0] ?? null
}

function normalizeSourceRecord(sourceDefinition, loadedSourceRecord, context) {
  const rows = loadedSourceRecord.rows ?? []
  const fields = Array.from(
    new Set([
      ...(loadedSourceRecord.fields ?? []),
      ...rows.flatMap((row) => Object.keys(row ?? {})),
    ]),
  )
  const transformedRows =
    typeof sourceDefinition.transformRows === 'function'
      ? (sourceDefinition.transformRows({
          rows,
          fields,
          station: context.station,
          popupState: context.station?.popup,
          sourceRecord: loadedSourceRecord,
        }) ?? rows)
      : rows
  const transformedFields = Array.from(
    new Set([
      ...fields,
      ...transformedRows.flatMap((row) => Object.keys(row ?? {})),
    ]),
  )

  return {
    id: sourceDefinition.id,
    url: loadedSourceRecord.url,
    rows: transformedRows,
    fields: transformedFields,
    xField: loadedSourceRecord.xField ?? findTimeAxisField(transformedFields),
    metadata: loadedSourceRecord.metadata ?? {},
  }
}

async function loadCsvSource(sourceDefinition, context) {
  const url = sourceDefinition.buildUrl({
    station: context.station,
    stationId: context.station?.id ?? context.station?.stationId,
    popupState: context.station?.popup,
  })
  const parsed = await fetchAndParseCsv(url, { dynamicTyping: true })

  return normalizeSourceRecord(
    sourceDefinition,
    {
      url,
      rows: parsed.rows,
      fields: parsed.fields,
      xField: findTimeAxisField(parsed.fields),
      metadata: {},
    },
    context,
  )
}

async function loadGradesSeries(sourceDefinition, context) {
  const request = sourceDefinition.buildRequest
    ? await sourceDefinition.buildRequest({
      station: context.station,
      popupState: context.station?.popup,
    })
    : {}
  const loadedSource = await loadGradesSeriesSource({
    hydrography: request.hydrography,
    comid: request.comid,
    dindex: request.dindex,
    valueColumn: request.valueColumn,
  })

  return normalizeSourceRecord(sourceDefinition, loadedSource, context)
}

async function loadGradesPercentiles(sourceDefinition, context) {
  const request = sourceDefinition.buildRequest
    ? await sourceDefinition.buildRequest({
      station: context.station,
      popupState: context.station?.popup,
    })
    : {}
  const loadedSource = await loadGradesPercentilesSource({
    hydrography: request.hydrography,
    comid: request.comid,
    endDateText: request.endDateText,
    dayCount: request.dayCount,
    columnNames: request.columnNames,
  })

  return normalizeSourceRecord(sourceDefinition, loadedSource, context)
}

async function loadCnrfcSeries(sourceDefinition, context) {
  const request = sourceDefinition.buildRequest
    ? await sourceDefinition.buildRequest({
      station: context.station,
      popupState: context.station?.popup,
    })
    : {}
  const loadedSource = await loadCnrfcSeriesSource({
    product: request.product,
    idx: request.idx,
    valueColumn: request.valueColumn,
  })

  return normalizeSourceRecord(sourceDefinition, loadedSource, context)
}

async function loadCnrfcPercentiles(sourceDefinition, context) {
  const request = sourceDefinition.buildRequest
    ? await sourceDefinition.buildRequest({
      station: context.station,
      popupState: context.station?.popup,
    })
    : {}
  const loadedSource = await loadCnrfcPercentilesSource({
    idx: request.idx,
    endDateText: request.endDateText,
    dayCount: request.dayCount,
    columnNames: request.columnNames,
    descriptorProduct: request.descriptorProduct,
  })

  return normalizeSourceRecord(sourceDefinition, loadedSource, context)
}

async function loadGshaSeries(sourceDefinition, context) {
  const request = sourceDefinition.buildRequest
    ? await sourceDefinition.buildRequest({
      station: context.station,
      popupState: context.station?.popup,
    })
    : {}
  const loadedSource = await loadGshaSeriesSource({
    frequency: request.frequency,
    dindex: request.dindex,
    columnNames: request.columnNames,
  })

  return normalizeSourceRecord(sourceDefinition, loadedSource, context)
}

export async function loadConfiguredSource(sourceDefinition, context) {
  const loader = sourceDefinition.loader ?? 'csv'

  if (loader === 'csv') {
    return loadCsvSource(sourceDefinition, context)
  }

  if (loader === 'gradesSeries') {
    return loadGradesSeries(sourceDefinition, context)
  }

  if (loader === 'gradesPercentiles') {
    return loadGradesPercentiles(sourceDefinition, context)
  }

  if (loader === 'cnrfcSeries') {
    return loadCnrfcSeries(sourceDefinition, context)
  }

  if (loader === 'cnrfcPercentiles') {
    return loadCnrfcPercentiles(sourceDefinition, context)
  }

  if (loader === 'gshaSeries') {
    return loadGshaSeries(sourceDefinition, context)
  }

  throw new Error(`Unsupported source loader "${loader}".`)
}

export async function loadConfiguredSources(sourceDefinitions, context) {
  const sourceEntries = await Promise.all(
    (sourceDefinitions ?? []).map(async (sourceDefinition) => [
      sourceDefinition.id,
      await loadConfiguredSource(sourceDefinition, context),
    ]),
  )

  return Object.fromEntries(sourceEntries)
}

import {
  alignClimatologyRows,
  CLIMATOLOGY_COLUMN_NAMES,
  convertTo2D,
  fetchFloat32ByteRange,
  generateDateArray,
} from './gradesBinaryData'
import { fetchJsonNoCache } from './network'

const CNRFC_BINARY_BASE_URL = 'https://cw3e.ucsd.edu/hydro/cnrfc/bin'
const CNRFC_CLIMATOLOGY_FILE_URL = `${CNRFC_BINARY_BASE_URL}/streamflow_ydrunpctl.bin`

const descriptorPromiseByProduct = new Map()

function buildDescriptorUrl(product) {
  return `${CNRFC_BINARY_BASE_URL}/streamflow_${product}.json`
}

function buildSeriesFileUrl(product) {
  return `${CNRFC_BINARY_BASE_URL}/streamflow_${product}.bin`
}

function parseIdx(idx) {
  const parsedIdx = Number.parseInt(idx, 10)
  return Number.isFinite(parsedIdx) ? parsedIdx : null
}

function validateProduct(product) {
  if (typeof product !== 'string' || !product.trim()) {
    throw new Error('Missing or invalid CNRFC binary product.')
  }

  return product.trim()
}

export async function fetchCnrfcBinaryDescriptor(product) {
  const normalizedProduct = validateProduct(product)

  if (!descriptorPromiseByProduct.has(normalizedProduct)) {
    const descriptorPromise = fetchJsonNoCache(buildDescriptorUrl(normalizedProduct))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load CNRFC descriptor for "${normalizedProduct}" (${response.status}).`)
        }

        return response.json()
      })

    descriptorPromiseByProduct.set(normalizedProduct, descriptorPromise)
  }

  return descriptorPromiseByProduct.get(normalizedProduct)
}

export async function loadCnrfcSeriesSource({
  product,
  idx,
  valueColumn = 'Value',
}) {
  const normalizedProduct = validateProduct(product)
  const parsedIdx = parseIdx(idx)

  if (!Number.isFinite(parsedIdx)) {
    throw new Error('Missing or invalid idx for CNRFC streamflow series lookup.')
  }

  const descriptor = await fetchCnrfcBinaryDescriptor(normalizedProduct)
  const numberOfDays = descriptor?.ndays

  if (!Number.isFinite(numberOfDays)) {
    throw new Error(`Missing or invalid ndays in CNRFC descriptor for "${normalizedProduct}".`)
  }

  const fileUrl = buildSeriesFileUrl(normalizedProduct)
  const byteOffset = parsedIdx * numberOfDays * 4
  const floatValues = await fetchFloat32ByteRange(fileUrl, byteOffset, numberOfDays)
  const dates = generateDateArray(descriptor?.start, descriptor?.end)

  const rows = dates.map((date, index) => ({
    Date: date.toISOString().slice(0, 10),
    [valueColumn]: floatValues[index] ?? null,
  }))

  return {
    url: fileUrl,
    rows,
    fields: ['Date', valueColumn],
    xField: 'Date',
    metadata: {
      product: normalizedProduct,
      idx: parsedIdx,
      start: descriptor?.start,
      end: descriptor?.end,
      ndays: descriptor?.ndays,
    },
  }
}

export async function loadCnrfcPercentilesSource({
  idx,
  endDateText,
  dayCount = 366,
  columnNames = CLIMATOLOGY_COLUMN_NAMES,
  descriptorProduct = 'nrt',
}) {
  const parsedIdx = parseIdx(idx)

  if (!Number.isFinite(parsedIdx)) {
    throw new Error('Missing or invalid idx for CNRFC streamflow climatology lookup.')
  }

  const descriptor = await fetchCnrfcBinaryDescriptor(descriptorProduct)
  const floatValues = await fetchFloat32ByteRange(
    CNRFC_CLIMATOLOGY_FILE_URL,
    parsedIdx * 366 * 7 * 4,
    366 * 7,
  )
  const percentileMatrix = convertTo2D(floatValues, 7, 366)
  const resolvedEndDateText = endDateText ?? descriptor?.end

  const rows = alignClimatologyRows(percentileMatrix, {
    endDateText: resolvedEndDateText,
    dayCount,
    columnNames,
  })

  return {
    url: CNRFC_CLIMATOLOGY_FILE_URL,
    rows,
    fields: ['Date', ...columnNames],
    xField: 'Date',
    metadata: {
      idx: parsedIdx,
      descriptorProduct,
      end: resolvedEndDateText,
      dayCount: Math.min(dayCount, 366),
    },
  }
}

export { CLIMATOLOGY_COLUMN_NAMES }

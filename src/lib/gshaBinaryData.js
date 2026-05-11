import {
  convertTo2D,
  fetchFloat32ByteRange,
  generateDateArray,
} from './gradesBinaryData'

export const GSHA_BINARY_BASE_URL = 'https://cw3e.ucsd.edu/hydro/gsha/bin'
export const GSHA_SERIES_COLUMN_NAMES = [
  'Pctl1',
  'Pctl10',
  'Pctl25',
  'Pctl50',
  'Pctl75',
  'Pctl90',
  'Pctl99',
  'Mean',
  'Maximum',
]

const descriptorPromiseByFrequency = new Map()

function normalizeFrequency(frequency) {
  if (frequency === 'monthly' || frequency === 'yearly') {
    return frequency
  }

  throw new Error(`Unsupported GSHA binary frequency "${frequency}".`)
}

function parseDindex(dindex) {
  const parsedDindex = Number.parseInt(dindex, 10)
  return Number.isFinite(parsedDindex) ? parsedDindex : null
}

function buildDescriptorUrl(frequency) {
  return `${GSHA_BINARY_BASE_URL}/gsha_${frequency}.json`
}

function buildSeriesFileUrl(frequency) {
  return `${GSHA_BINARY_BASE_URL}/gsha_${frequency}.bin`
}

function getStepCount(descriptor, frequency) {
  const stepCount = frequency === 'yearly' ? descriptor?.nyears : descriptor?.nmonths

  if (!Number.isFinite(stepCount)) {
    throw new Error(`Missing or invalid GSHA ${frequency} descriptor step count.`)
  }

  return stepCount
}

function formatIsoDateUtc(date) {
  return date.toISOString().slice(0, 10)
}

export async function fetchGshaBinaryDescriptor(frequency) {
  const normalizedFrequency = normalizeFrequency(frequency)

  if (!descriptorPromiseByFrequency.has(normalizedFrequency)) {
    const descriptorPromise = fetch(buildDescriptorUrl(normalizedFrequency))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load GSHA ${normalizedFrequency} descriptor (${response.status}).`)
        }

        return response.json()
      })

    descriptorPromiseByFrequency.set(normalizedFrequency, descriptorPromise)
  }

  return descriptorPromiseByFrequency.get(normalizedFrequency)
}

export async function loadGshaSeriesSource({
  frequency,
  dindex,
  columnNames = GSHA_SERIES_COLUMN_NAMES,
}) {
  const normalizedFrequency = normalizeFrequency(frequency)
  const parsedDindex = parseDindex(dindex)

  if (!Number.isFinite(parsedDindex)) {
    throw new Error('Missing or invalid dindex for GSHA series lookup.')
  }

  const descriptor = await fetchGshaBinaryDescriptor(normalizedFrequency)
  const stepCount = getStepCount(descriptor, normalizedFrequency)
  const fileUrl = buildSeriesFileUrl(normalizedFrequency)
  const byteOffset = parsedDindex * stepCount * columnNames.length * 4
  const floatValues = await fetchFloat32ByteRange(fileUrl, byteOffset, stepCount * columnNames.length)
  const variableMatrix = convertTo2D(floatValues, columnNames.length, stepCount)
  const dates = generateDateArray(descriptor?.start, descriptor?.end, normalizedFrequency)

  const rows = dates.map((date, timeIndex) => {
    const row = { Date: formatIsoDateUtc(date) }

    columnNames.forEach((columnName, columnIndex) => {
      row[columnName] = variableMatrix[columnIndex]?.[timeIndex] ?? null
    })

    return row
  })

  return {
    url: fileUrl,
    rows,
    fields: ['Date', ...columnNames],
    xField: 'Date',
    metadata: {
      frequency: normalizedFrequency,
      dindex: parsedDindex,
      start: descriptor?.start,
      end: descriptor?.end,
      nsteps: stepCount,
    },
  }
}

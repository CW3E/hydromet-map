export const GRADES_BINARY_BASE_URL = 'https://cw3e.ucsd.edu/hydro/grades_hydrodl/bin'
export const GRADES_BINARY_DESCRIPTOR_URL = `${GRADES_BINARY_BASE_URL}/grades_hydrodl.json`
const CLIMATOLOGY_COLUMN_NAMES = ['Pctl5', 'Pctl10', 'Pctl20', 'Pctl50', 'Pctl80', 'Pctl90', 'Pctl95']

let gradesDescriptorPromise = null

function parseIsoDateUtc(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText ?? '')) {
    return null
  }

  const parsedDate = new Date(`${dateText}T00:00:00Z`)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function formatIsoDateUtc(date) {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date, days) {
  const nextDate = new Date(date.getTime())
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate
}

function buildMonthDayKey(date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${month}-${day}`
}

function buildLeapYearMonthDayLookup() {
  const lookup = new Map()
  const referenceStart = parseIsoDateUtc('2000-01-01')

  Array.from({ length: 366 }, (_, index) => addUtcDays(referenceStart, index)).forEach((date, index) => {
    lookup.set(buildMonthDayKey(date), index)
  })

  return lookup
}

const LEAP_YEAR_MONTH_DAY_LOOKUP = buildLeapYearMonthDayLookup()

export async function fetchGradesBinaryDescriptor() {
  if (!gradesDescriptorPromise) {
    gradesDescriptorPromise = fetch(GRADES_BINARY_DESCRIPTOR_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load GRADES descriptor (${response.status}).`)
        }

        return response.json()
      })
  }

  return gradesDescriptorPromise
}

export function generateDateArray(startDateText, endDateText, frequency = 'daily') {
  const startDate = parseIsoDateUtc(startDateText)
  const endDate = parseIsoDateUtc(endDateText)

  if (!startDate || !endDate || startDate > endDate) {
    return []
  }

  const dates = []
  const currentDate = new Date(startDate.getTime())

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate.getTime()))

    if (frequency === 'yearly') {
      currentDate.setUTCFullYear(currentDate.getUTCFullYear() + 1)
    } else if (frequency === 'monthly') {
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1)
    } else {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }
  }

  return dates
}

export function convertTo2D(array, rows, columns) {
  if (rows * columns !== array.length) {
    throw new Error('Rows and columns dimensions do not match array length.')
  }

  return Array.from({ length: rows }, (_, rowIndex) =>
    array.slice(rowIndex * columns, (rowIndex + 1) * columns),
  )
}

export async function fetchFloat32ByteRange(url, byteOffset, valueCount) {
  const byteLength = valueCount * 4
  const response = await fetch(url, {
    headers: {
      Range: `bytes=${byteOffset}-${byteOffset + byteLength - 1}`,
    },
  })

  if (!response.ok || (response.status !== 200 && response.status !== 206)) {
    throw new Error(`Failed to fetch byte range from ${url}.`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Float32Array(arrayBuffer)
}

function resolveGradesSeriesFileUrl(hydrography, comid) {
  if (hydrography === 'MERIT') {
    const pfaf2 = Math.floor(comid / 1000000)
    return `${GRADES_BINARY_BASE_URL}/GRADES-hydroDL_${pfaf2}.bin`
  }

  const pfaf1 = Math.floor(comid / 10000000000)
  return `${GRADES_BINARY_BASE_URL}/SWORD_GRADES-hydroDL_${pfaf1}.bin`
}

function resolveGradesSeriesByteOffset(hydrography, comid, dindex, numberOfDays) {
  if (hydrography === 'MERIT') {
    const pfaf2 = Math.floor(comid / 1000000)
    const countIndex = comid - pfaf2 * 1000000 - 1
    return countIndex * numberOfDays * 4
  }

  return dindex * numberOfDays * 4
}

export async function loadGradesSeriesSource({
  hydrography,
  comid,
  dindex = 0,
  valueColumn = 'Value',
}) {
  const descriptor = await fetchGradesBinaryDescriptor()
  const metadata = descriptor?.[hydrography]

  if (!metadata) {
    throw new Error(`Missing GRADES descriptor metadata for hydrography "${hydrography}".`)
  }

  if (!Number.isFinite(comid)) {
    throw new Error(`Missing or invalid COMID for hydrography "${hydrography}".`)
  }

  const numberOfDays = metadata.ndays
  const fileUrl = resolveGradesSeriesFileUrl(hydrography, comid)
  const byteOffset = resolveGradesSeriesByteOffset(hydrography, comid, dindex, numberOfDays)
  const floatValues = await fetchFloat32ByteRange(fileUrl, byteOffset, numberOfDays)
  const dates = generateDateArray(metadata.start, metadata.end)

  const rows = dates.map((date, index) => ({
    Date: formatIsoDateUtc(date),
    [valueColumn]: floatValues[index] ?? null,
  }))

  return {
    url: fileUrl,
    rows,
    fields: ['Date', valueColumn],
    xField: 'Date',
    metadata: {
      hydrography,
      start: metadata.start,
      end: metadata.end,
      ndays: metadata.ndays,
    },
  }
}

export function alignClimatologyRows(percentileMatrix, {
  endDateText,
  dayCount = 366,
  columnNames = CLIMATOLOGY_COLUMN_NAMES,
}) {
  const endDate = parseIsoDateUtc(endDateText)

  if (!endDate) {
    throw new Error(`Invalid climatology end date "${endDateText}".`)
  }

  const numberOfDays = Math.min(dayCount, 366)
  const startDate = addUtcDays(endDate, -(numberOfDays - 1))

  return Array.from({ length: numberOfDays }, (_, index) => addUtcDays(startDate, index)).map((date) => {
    const climatologyIndex = LEAP_YEAR_MONTH_DAY_LOOKUP.get(buildMonthDayKey(date))
    const row = { Date: formatIsoDateUtc(date) }

    columnNames.forEach((columnName, columnIndex) => {
      row[columnName] = percentileMatrix[columnIndex]?.[climatologyIndex] ?? null
    })

    return row
  })
}

export async function loadGradesPercentilesSource({
  hydrography = 'MERIT',
  comid,
  endDateText,
  dayCount = 366,
  columnNames = CLIMATOLOGY_COLUMN_NAMES,
}) {
  if (!Number.isFinite(comid)) {
    throw new Error('Missing or invalid COMID for climatology lookup.')
  }

  const descriptor = await fetchGradesBinaryDescriptor()
  const metadata = descriptor?.[hydrography] ?? descriptor?.MERIT

  if (!metadata) {
    throw new Error('Missing GRADES descriptor metadata for climatology lookup.')
  }

  const pfaf2 = Math.floor(comid / 1000000)
  const countIndex = comid - pfaf2 * 1000000 - 1
  const fileUrl = `${GRADES_BINARY_BASE_URL}/GRADES-hydroDL_ydrunpctl_${pfaf2}.bin`
  const byteOffset = countIndex * 366 * 7 * 4
  const floatValues = await fetchFloat32ByteRange(fileUrl, byteOffset, 366 * 7)
  const percentileMatrix = convertTo2D(floatValues, 7, 366)
  const rows = alignClimatologyRows(percentileMatrix, {
    endDateText: endDateText ?? metadata.end,
    dayCount,
    columnNames,
  })

  return {
    url: fileUrl,
    rows,
    fields: ['Date', ...columnNames],
    xField: 'Date',
    metadata: {
      hydrography,
      end: endDateText ?? metadata.end,
      dayCount: Math.min(dayCount, 366),
    },
  }
}

export { CLIMATOLOGY_COLUMN_NAMES }

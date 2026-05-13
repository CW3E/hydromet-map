import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const DEFAULT_INPUT = 'tools/snapshots/map.example.json'
const DEFAULT_OUTPUT = 'tools/snapshots/output'
const DEFAULT_VIEWPORT = { width: 1440, height: 1000 }
const DEFAULT_WAIT_MS = 5000
const DEFAULT_MAP_CROP = { top: 0, right: 0, bottom: 0, left: 0 }
const ACTIVE_POPUP_PANEL_SELECTOR = '.maplibregl-popup .station-popup__tab-panel:not([hidden]) .station-popup__plot'
const ACTIVE_POPUP_CONTENT_SELECTOR = `${ACTIVE_POPUP_PANEL_SELECTOR} .js-plotly-plot, ${ACTIVE_POPUP_PANEL_SELECTOR} .plot-container, ${ACTIVE_POPUP_PANEL_SELECTOR}`
const POPUP_CLOSE_BUTTON_SELECTOR = '.maplibregl-popup-close-button'
const POPUP_FEATURE_LOOKUP = {
  b120Points: {
    url: 'https://cw3e.ucsd.edu/hydro/b120/csv/b120_stations_24.geojson',
    featureIdProperty: 'Station_ID',
  },
  yampaPoints: {
    url: 'https://cw3e.ucsd.edu/hydro/yampa/csv/yampa_points.geojson',
    featureIdProperty: 'station_id',
  },
  cnrfcPoints: {
    url: 'https://cw3e.ucsd.edu/hydro/cnrfc/csv/fcst_points.geojson',
    featureIdProperty: 'ID',
  },
}
const featureLookupCache = new Map()

function readCliOptions(argv) {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    variables: [],
    startDate: null,
    endDate: null,
    dateStep: 'month',
    time: null,
    ownerLayerId: null,
    featureIds: [],
    tabs: [],
    popupSelects: {},
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--input' || arg === '-i') {
      options.input = argv[index + 1] ?? options.input
      index += 1
    } else if (arg === '--output' || arg === '-o') {
      options.output = argv[index + 1] ?? options.output
      index += 1
    } else if (arg === '--var' || arg === '--variable') {
      const rawValue = argv[index + 1] ?? ''
      options.variables.push(...rawValue.split(',').map((item) => item.trim()).filter(Boolean))
      index += 1
    } else if (arg === '--start-date') {
      options.startDate = argv[index + 1] ?? options.startDate
      index += 1
    } else if (arg === '--end-date') {
      options.endDate = argv[index + 1] ?? options.endDate
      index += 1
    } else if (arg === '--date-step') {
      options.dateStep = argv[index + 1] ?? options.dateStep
      index += 1
    } else if (arg === '--time') {
      options.time = argv[index + 1] ?? options.time
      index += 1
    } else if (arg === '--owner-layer-id' || arg === '--owner') {
      options.ownerLayerId = argv[index + 1] ?? options.ownerLayerId
      index += 1
    } else if (arg === '--feature-id' || arg === '--station-id' || arg === '--station') {
      const rawValue = argv[index + 1] ?? ''
      options.featureIds.push(...rawValue.split(',').map((item) => item.trim()).filter(Boolean))
      index += 1
    } else if (arg === '--tab') {
      const rawValue = argv[index + 1] ?? ''
      options.tabs.push(...rawValue.split(',').map((item) => item.trim()).filter(Boolean))
      index += 1
    } else if (arg === '--popup-select') {
      const rawValue = argv[index + 1] ?? ''
      const separatorIndex = rawValue.indexOf('=')

      if (separatorIndex > 0) {
        options.popupSelects[rawValue.slice(0, separatorIndex).trim()] = rawValue.slice(separatorIndex + 1).trim()
      }

      index += 1
    } else if (arg === '--forecast-update') {
      options.popupSelects.Update = argv[index + 1] ?? options.popupSelects.Update
      index += 1
    } else if (arg === '--post-processing') {
      options.popupSelects['Post-Processing'] = argv[index + 1] ?? options.popupSelects['Post-Processing']
      index += 1
    }
  }

  return options
}

function sanitizeFilenameStem(value) {
  return String(value ?? 'snapshot')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^-+|-+$/g, '')
    || 'snapshot'
}

function buildEntryName(entry) {
  if (entry.name) {
    return entry.name
  }

  const ownerLayerId = entry.ownerLayerId ?? 'snapshot'
  const featureId = entry.featureId ?? entry.stationId
  const tabId = entry.tab

  return [ownerLayerId, featureId, tabId].filter(Boolean).join(' ')
}

function normalizeCrop(crop) {
  if (crop === true) {
    return {
      top: 95,
      right: 76,
      bottom: 56,
      left: 10,
    }
  }

  if (!crop || typeof crop !== 'object') {
    return DEFAULT_MAP_CROP
  }

  return {
    top: Number.isFinite(crop.top) ? Math.max(0, crop.top) : 0,
    right: Number.isFinite(crop.right) ? Math.max(0, crop.right) : 0,
    bottom: Number.isFinite(crop.bottom) ? Math.max(0, crop.bottom) : 0,
    left: Number.isFinite(crop.left) ? Math.max(0, crop.left) : 0,
  }
}

function buildViewportClip(viewport, crop) {
  const normalizedCrop = normalizeCrop(crop)
  const width = viewport.width - normalizedCrop.left - normalizedCrop.right
  const height = viewport.height - normalizedCrop.top - normalizedCrop.bottom

  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid crop for ${viewport.width} x ${viewport.height} viewport.`)
  }

  return {
    x: normalizedCrop.left,
    y: normalizedCrop.top,
    width,
    height,
  }
}

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

function addDateStep(date, dateStep) {
  const nextDate = new Date(date)

  if (dateStep === 'day') {
    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
    return nextDate
  }

  if (dateStep === 'year') {
    nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1)
    return nextDate
  }

  nextDate.setUTCMonth(nextDate.getUTCMonth() + 1)
  return nextDate
}

function buildDateSeries({ startDateText, endDateText, dateStep }) {
  const startDate = parseIsoDateUtc(startDateText)
  const endDate = parseIsoDateUtc(endDateText)

  if (!startDate || !endDate) {
    throw new Error('Command-line date generation requires --start-date and --end-date in YYYY-MM-DD format.')
  }

  if (startDate > endDate) {
    throw new Error('--start-date must be before or equal to --end-date.')
  }

  if (!['day', 'month', 'year'].includes(dateStep)) {
    throw new Error('--date-step must be one of: day, month, year.')
  }

  const dates = []
  let cursor = startDate

  while (cursor <= endDate) {
    dates.push(formatIsoDateUtc(cursor))
    cursor = addDateStep(cursor, dateStep)
  }

  return dates
}

function extractDefaultTime(defaults) {
  const defaultDateTime = defaults?.params?.dt

  if (typeof defaultDateTime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(defaultDateTime)) {
    return defaultDateTime.slice(11, 16)
  }

  return '16:00'
}

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    throw new Error(
      'Playwright is not installed. Run "npm install -D playwright" and "npx playwright install chromium" first.',
    )
  }
}

async function readBookmarkEntries(inputPath, options) {
  const rawText = await fs.readFile(inputPath, 'utf8')
  const parsed = JSON.parse(rawText)

  if (Array.isArray(parsed)) {
    return parsed
  }

  if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.snapshots) || parsed.defaults)) {
    if (hasCliGenerationOptions(options)) {
      return expandCliGeneratedSnapshotEntries(parsed, options)
    }

    if (!Array.isArray(parsed.snapshots)) {
      throw new Error(`Snapshot input with only "defaults" requires CLI --var, --start-date, and --end-date options: ${inputPath}`)
    }

    return expandSnapshotEntries(parsed)
  }

  throw new Error(`Snapshot input must be a JSON array, an object with "snapshots", or defaults plus CLI generation options: ${inputPath}`)
}

function hasCliGenerationOptions(options) {
  return (
    options.variables.length > 0
    || options.startDate
    || options.endDate
    || options.ownerLayerId
    || options.featureIds.length > 0
    || options.tabs.length > 0
    || Object.keys(options.popupSelects).length > 0
  )
}

function hasCliDateGenerationOptions(options) {
  return options.variables.length > 0 || options.startDate || options.endDate
}

function hasCliPlotGenerationOptions(options) {
  return options.ownerLayerId || options.featureIds.length > 0 || options.tabs.length > 0
}

function expandCliGeneratedSnapshotEntries(config, options) {
  const defaults = config.defaults ?? {}

  if (hasCliPlotGenerationOptions(options) && !hasCliDateGenerationOptions(options)) {
    return expandCliGeneratedPlotSnapshotEntries(config, options)
  }

  const variables = options.variables.length > 0
    ? options.variables
    : Array.from(new Set(config.snapshots.map((snapshot) => snapshot?.params?.var).filter(Boolean)))

  if (variables.length === 0) {
    throw new Error('Command-line date generation requires at least one --var value or snapshot params.var value.')
  }

  const dates = buildDateSeries({
    startDateText: options.startDate,
    endDateText: options.endDate,
    dateStep: options.dateStep,
  })
  const time = options.time ?? extractDefaultTime(defaults)
  const projectId = defaults.params?.prj ?? 'snapshot'
  const generatedSnapshots = variables.flatMap((variable) =>
    dates.map((dateText) => ({
      name: `${projectId} ${variable} ${dateText}`,
      params: {
        var: variable,
        d: dateText,
        dt: `${dateText}T${time}`,
      },
    })),
  )

  return expandSnapshotEntries({
    defaults,
    snapshots: generatedSnapshots,
  })
}

function expandCliGeneratedPlotSnapshotEntries(config, options) {
  const defaults = config.defaults ?? {}
  const ownerLayerId = options.ownerLayerId ?? defaults.ownerLayerId
  const featureIds = options.featureIds.length > 0
    ? options.featureIds
    : Array.from(new Set((config.snapshots ?? []).map((snapshot) => snapshot?.featureId ?? snapshot?.stationId).filter(Boolean)))
  const tabs = options.tabs.length > 0
    ? options.tabs
    : Array.from(new Set((config.snapshots ?? []).map((snapshot) => snapshot?.tab).filter(Boolean)))

  if (!ownerLayerId) {
    throw new Error('Plot snapshot CLI generation requires --owner-layer-id or defaults.ownerLayerId.')
  }

  if (featureIds.length === 0) {
    throw new Error('Plot snapshot CLI generation requires --feature-id or snapshot featureId values.')
  }

  if (tabs.length === 0) {
    throw new Error('Plot snapshot CLI generation requires --tab or snapshot tab values.')
  }

  const generatedSnapshots = featureIds.flatMap((featureId) =>
    tabs.map((tab) => ({
      ownerLayerId,
      featureId,
      tab,
      popupSelects: {
        ...(defaults.popupSelects ?? {}),
        ...options.popupSelects,
      },
    })),
  )

  return expandSnapshotEntries({
    defaults,
    snapshots: generatedSnapshots,
  })
}

function appendParams(url, params) {
  const nextUrl = new URL(url)

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      nextUrl.searchParams.delete(key)
      return
    }

    nextUrl.searchParams.set(key, String(value))
  })

  return nextUrl.toString()
}

function buildSnapshotUrl(defaults, snapshot) {
  if (snapshot.url) {
    return appendParams(snapshot.url, snapshot.params)
  }

  const baseUrl = defaults.baseUrl ?? defaults.url

  if (!baseUrl) {
    throw new Error(`Snapshot "${snapshot.name ?? 'unnamed'}" is missing a URL and no defaults.baseUrl was provided.`)
  }

  return appendParams(baseUrl, {
    ...(defaults.params ?? {}),
    ...(snapshot.params ?? {}),
  })
}

function getFeatureCoordinates(feature) {
  if (feature?.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) {
    return null
  }

  const [longitude, latitude] = feature.geometry.coordinates

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return { longitude, latitude }
}

async function loadFeatureLookup(ownerLayerId) {
  if (featureLookupCache.has(ownerLayerId)) {
    return featureLookupCache.get(ownerLayerId)
  }

  const lookupConfig = POPUP_FEATURE_LOOKUP[ownerLayerId]

  if (!lookupConfig) {
    throw new Error(`No plot snapshot feature lookup is configured for ownerLayerId "${ownerLayerId}".`)
  }

  const response = await fetch(lookupConfig.url)

  if (!response.ok) {
    throw new Error(`Failed to load feature lookup for "${ownerLayerId}" (${response.status}).`)
  }

  const geojson = await response.json()
  const features = Array.isArray(geojson?.features) ? geojson.features : []
  const lookup = new Map()

  features.forEach((feature) => {
    const featureId = feature?.properties?.[lookupConfig.featureIdProperty]
    const coordinates = getFeatureCoordinates(feature)

    if (featureId == null || !coordinates || lookup.has(String(featureId))) {
      return
    }

    lookup.set(String(featureId), {
      featureId,
      ...coordinates,
    })
  })

  featureLookupCache.set(ownerLayerId, lookup)
  return lookup
}

async function resolvePopupBookmarkParams(entry) {
  const ownerLayerId = entry.ownerLayerId
  const featureId = entry.featureId ?? entry.stationId

  if (!ownerLayerId && !featureId) {
    return {}
  }

  if (!ownerLayerId || featureId == null) {
    throw new Error(`Plot snapshot "${entry.name ?? 'unnamed'}" must provide both ownerLayerId and featureId.`)
  }

  const explicitLongitude = Number.parseFloat(entry.longitude)
  const explicitLatitude = Number.parseFloat(entry.latitude)

  if (Number.isFinite(explicitLongitude) && Number.isFinite(explicitLatitude)) {
    return {
      pop: [ownerLayerId, featureId, explicitLongitude.toFixed(5), explicitLatitude.toFixed(5)].join('|'),
      ...(entry.tab ? { tab: entry.tab } : {}),
    }
  }

  const lookup = await loadFeatureLookup(ownerLayerId)
  const featureLocation = lookup.get(String(featureId))

  if (!featureLocation) {
    throw new Error(`No feature "${featureId}" was found in ownerLayerId "${ownerLayerId}".`)
  }

  return {
    pop: [
      ownerLayerId,
      featureId,
      featureLocation.longitude.toFixed(5),
      featureLocation.latitude.toFixed(5),
    ].join('|'),
    c: `${featureLocation.longitude.toFixed(4)},${featureLocation.latitude.toFixed(4)}`,
    z: entry.restoreZoom ?? entry.params?.z ?? '8',
    ...(entry.tab ? { tab: entry.tab } : {}),
  }
}

async function resolveEntryUrl(entry) {
  const popupParams = await resolvePopupBookmarkParams(entry)
  return appendParams(entry.url, popupParams)
}

function expandSnapshotEntries(config) {
  const defaults = config.defaults ?? {}

  return config.snapshots.map((snapshot) => ({
    ...defaults,
    ...snapshot,
    popupSelects: {
      ...(defaults.popupSelects ?? {}),
      ...(snapshot.popupSelects ?? {}),
    },
    viewport: {
      ...(defaults.viewport ?? {}),
      ...(snapshot.viewport ?? {}),
    },
    url: buildSnapshotUrl(defaults, snapshot),
  }))
}

async function waitForMap(page, waitMs) {
  await page.waitForSelector('.maplibregl-canvas', { timeout: 30000 })
  await page.waitForTimeout(waitMs)
}

async function screenshotActivePlot(page, outputPath) {
  const plotPanel = page.locator(ACTIVE_POPUP_CONTENT_SELECTOR).first()
  const count = await plotPanel.count()

  if (count === 0) {
    return false
  }

  await plotPanel.screenshot({ path: outputPath })
  return true
}

async function hasActivePlot(page) {
  return (await page.locator(ACTIVE_POPUP_PANEL_SELECTOR).count()) > 0
}

async function waitForActivePlot(page, timeout) {
  try {
    await page.waitForSelector(ACTIVE_POPUP_PANEL_SELECTOR, { timeout })
    return true
  } catch {
    return false
  }
}

async function tryOpenPopupFromMapCenter(page, entry, viewport, timeout) {
  if (!entry.ownerLayerId || !(entry.featureId ?? entry.stationId)) {
    return false
  }

  if (await hasActivePlot(page)) {
    return true
  }

  await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2))
  return waitForActivePlot(page, timeout)
}

async function getPopupBookmarkFeatureId(page) {
  return page.evaluate(() => {
    const params = new URLSearchParams(window.location.search)
    const popupText = params.get('pop') ?? params.get('popup')

    if (!popupText) {
      return null
    }

    return popupText.split('|')[1] ?? null
  })
}

async function closePopupIfVisible(page) {
  const closeButton = page.locator(POPUP_CLOSE_BUTTON_SELECTOR).first()

  if ((await closeButton.count()) > 0) {
    await closeButton.click()
  }
}

async function tryOpenPopupAtBookmarkCoordinate(page, entry, timeout) {
  if (!entry.ownerLayerId || !(entry.featureId ?? entry.stationId)) {
    return false
  }

  const didOpenFromBookmark = await waitForActivePlot(page, Math.min(timeout, 3000))
  const requestedFeatureId = String(entry.featureId ?? entry.stationId)

  if (didOpenFromBookmark) {
    const popupFeatureId = await getPopupBookmarkFeatureId(page)

    if (!popupFeatureId || popupFeatureId === requestedFeatureId) {
      return true
    }

    await closePopupIfVisible(page)
  }

  const clicked = await page.evaluate((featureId) => {
    const params = new URLSearchParams(window.location.search)
    const popupText = params.get('pop') ?? params.get('popup')

    if (!popupText) {
      return false
    }

    const [, popupFeatureId, longitudeText, latitudeText] = popupText.split('|')
    const longitude = Number.parseFloat(longitudeText)
    const latitude = Number.parseFloat(latitudeText)

    if (String(popupFeatureId) !== String(featureId) || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return false
    }

    const map = window.__hydrometMap

    if (!map) {
      return false
    }

    const point = map.project([longitude, latitude])
    const canvas = map.getCanvas()
    const rect = canvas.getBoundingClientRect()
    const target = document.elementFromPoint(rect.left + point.x, rect.top + point.y)

    if (!target) {
      return false
    }

    target.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + point.x,
      clientY: rect.top + point.y,
      button: 0,
    }))

    return true
  }, requestedFeatureId)

  if (!clicked) {
    return false
  }

  const didOpen = await waitForActivePlot(page, timeout)
  const popupFeatureId = await getPopupBookmarkFeatureId(page)

  return didOpen && (!popupFeatureId || popupFeatureId === requestedFeatureId)
}

function normalizeControlLabel(label) {
  return String(label ?? '').trim().replace(/:$/, '').toLowerCase()
}

async function applyPopupSelects(page, popupSelects, waitMs) {
  const selectEntries = Object.entries(popupSelects ?? {}).filter(([, value]) => value !== null && value !== undefined)

  for (const [label, value] of selectEntries) {
    const normalizedLabel = normalizeControlLabel(label)
    const selectLocator = page
      .locator('.maplibregl-popup .station-popup__control')
      .filter({
        hasText: new RegExp(`^\\s*${normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:?`, 'i'),
      })
      .locator('select')
      .first()

    if ((await selectLocator.count()) === 0) {
      throw new Error(`Popup selector "${label}" was not found.`)
    }

    await selectLocator.selectOption(String(value))
    await page.waitForTimeout(waitMs)
  }
}

async function snapshotEntry({ browser, entry, outputDir }) {
  if (!entry?.url) {
    console.warn('Skipping snapshot entry without a URL.')
    return
  }

  const name = sanitizeFilenameStem(buildEntryName(entry))
  const viewport = {
    ...DEFAULT_VIEWPORT,
    ...(entry.viewport ?? {}),
  }
  const waitMs = Number.isFinite(entry.waitMs) ? entry.waitMs : DEFAULT_WAIT_MS
  const shouldSnapshotMap = entry.map ?? true
  const shouldSnapshotPlot = entry.plot ?? false
  const mapClip = buildViewportClip(viewport, entry.cropMap ?? entry.crop)
  const page = await browser.newPage({ viewport })

  try {
    const resolvedUrl = await resolveEntryUrl(entry)

    console.log(`Opening ${name}: ${resolvedUrl}`)
    await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await waitForMap(page, waitMs)

    if (shouldSnapshotPlot) {
      const didOpenTargetPopup = await tryOpenPopupAtBookmarkCoordinate(page, entry, waitMs)

      if (!didOpenTargetPopup) {
        await tryOpenPopupFromMapCenter(page, entry, viewport, waitMs)
      }
      await applyPopupSelects(page, entry.popupSelects, Math.min(waitMs, 3000))
      await waitForActivePlot(page, waitMs)
    }

    if (shouldSnapshotMap) {
      const mapOutputPath = path.join(outputDir, `${name}-map.png`)
      await page.screenshot({ path: mapOutputPath, clip: mapClip })
      console.log(`  saved ${mapOutputPath}`)
    }

    if (shouldSnapshotPlot) {
      const plotOutputPath = path.join(outputDir, `${name}-plot.png`)
      const didSavePlot = await screenshotActivePlot(page, plotOutputPath)

      if (didSavePlot) {
        console.log(`  saved ${plotOutputPath}`)
      } else {
        console.warn(`  skipped plot screenshot for ${name}; no active popup plot/table was found.`)
      }
    }
  } finally {
    await page.close()
  }
}

async function main() {
  const options = readCliOptions(process.argv.slice(2))
  const inputPath = path.resolve(options.input)
  const outputDir = path.resolve(options.output)
  const entries = await readBookmarkEntries(inputPath, options)
  const { chromium } = await loadPlaywright()

  await fs.mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch()

  try {
    for (const entry of entries) {
      await snapshotEntry({ browser, entry, outputDir })
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

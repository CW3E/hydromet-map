import {
  BASEMAPS,
  createDefaultAppState,
  DEFAULT_PROJECT_ID,
  getProjectDefinition,
  getProjectLayerFamily,
  getProjectMapLayers,
} from '../config/mapConfig'

function getDefaultProjectState(projectId = DEFAULT_PROJECT_ID) {
  return createDefaultAppState().projectStateById[projectId]
}

function getDefaultFamilyState(projectId = DEFAULT_PROJECT_ID) {
  return getDefaultProjectState(projectId)?.family ?? null
}

function getFirstParam(params, ...keys) {
  for (const key of keys) {
    const value = params.get(key)

    if (value !== null) {
      return value
    }
  }

  return null
}

function getSelectedStationBookmarkId(selectedStation) {
  return selectedStation?.id
    ?? selectedStation?.stationId
    ?? selectedStation?.reachId
    ?? selectedStation?.featureId
    ?? null
}

function formatBookmarkCoordinate(value) {
  const parsedValue = Number.parseFloat(value)
  return Number.isFinite(parsedValue) ? parsedValue.toFixed(5) : ''
}

export function readPopupStateFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const popupText = getFirstParam(params, 'pop', 'popup')
  const tabId = getFirstParam(params, 'tab', 'popupTab')
  const forecastProduct = getFirstParam(params, 'fprod', 'forecastProduct')
  const forecastUpdateDate = getFirstParam(params, 'fupd', 'forecastUpdateDate')
  const forecastPostProcessing = getFirstParam(params, 'fpp', 'forecastPostProcessing')

  if (!popupText) {
    return null
  }

  const [ownerLayerId, featureId, longitudeText, latitudeText] = popupText.split('|')
  const longitude = Number.parseFloat(longitudeText)
  const latitude = Number.parseFloat(latitudeText)

  if (!ownerLayerId || !featureId || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return {
    ownerLayerId,
    featureId,
    longitude,
    latitude,
    tabId: tabId || null,
    forecastProduct: forecastProduct || null,
    forecastUpdateDate: forecastUpdateDate || null,
    forecastPostProcessing: forecastPostProcessing || null,
  }
}

export function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search)

  if (!params.toString()) {
    return createDefaultAppState()
  }

  const nextState = createDefaultAppState()
  const projectParam = getFirstParam(params, 'prj', 'project')

  if (getProjectDefinition(projectParam)?.id) {
    nextState.activeProjectId = getProjectDefinition(projectParam).id
  }

  const activeProjectId = nextState.activeProjectId
  const activeProjectState = nextState.projectStateById[activeProjectId]
  const layerFamily = getProjectLayerFamily(activeProjectId)
  const familyVariables = layerFamily?.raster?.variables ?? {}
  const familyProducts = layerFamily?.selectors?.products ?? []
  const familyEnsembleTraces = layerFamily?.selectors?.ensembleTraces ?? []
  const basemapId = getFirstParam(params, 'bm', 'basemap')
  const projection = getFirstParam(params, 'proj', 'projection')
  const terrain = getFirstParam(params, 'ter', 'terrain')
  const center = getFirstParam(params, 'c', 'center')
  const zoom = getFirstParam(params, 'z', 'zoom')
  const bearing = getFirstParam(params, 'brg', 'bearing')
  const pitch = getFirstParam(params, 'pit', 'pitch')
  const variable = getFirstParam(params, 'var', 'variable')
  const product = getFirstParam(params, 'prod', 'product')
  const ensemble = getFirstParam(params, 'ens', 'ensemble')
  const temporalMode = getFirstParam(params, 'tm', 'temporalMode')
  const date = getFirstParam(params, 'd', 'date')
  const datetime = getFirstParam(params, 'dt', 'datetime')
  const layers = getFirstParam(params, 'lyr', 'layers')

  if (BASEMAPS.some((item) => item.id === basemapId)) {
    activeProjectState.basemapId = basemapId
  }

  if (projection === 'globe' || projection === 'mercator') {
    activeProjectState.projection = projection
  }

  if (terrain === 'true' || terrain === 'false') {
    activeProjectState.terrainEnabled = terrain === 'true'
  }

  if (center) {
    activeProjectState.view.center = center
  }

  if (zoom) {
    activeProjectState.view.zoom = zoom
  }

  if (bearing) {
    activeProjectState.view.bearing = bearing
  }

  if (pitch) {
    activeProjectState.view.pitch = pitch
  }

  if (activeProjectState.family && layerFamily) {
    if (Object.hasOwn(familyVariables, variable)) {
      activeProjectState.family.variable = variable
    }

    if (familyProducts.includes(product)) {
      activeProjectState.family.product = product
    }

    if (familyEnsembleTraces.includes(ensemble)) {
      activeProjectState.family.ensemble = ensemble
    }

    if (temporalMode === 'date' || temporalMode === 'datetime') {
      activeProjectState.family.temporalMode = temporalMode
    }

    if (date) {
      activeProjectState.family.date = date
    }

    if (datetime) {
      activeProjectState.family.datetime = datetime
    }
  }

  if (layers) {
    const enabledIds = new Set(layers.split(','))
    getProjectMapLayers(activeProjectId).forEach((layer) => {
      activeProjectState.layers[layer.id] = enabledIds.has(layer.id)
    })
  }

  return nextState
}

export function writeStateToUrl(state, { selectedStation = null } = {}) {
  const params = new URLSearchParams()
  const activeProjectId = state.activeProjectId ?? DEFAULT_PROJECT_ID
  const activeProjectState = state.projectStateById?.[activeProjectId] ?? getDefaultProjectState(activeProjectId)

  params.set('prj', activeProjectId)
  params.set('bm', activeProjectState.basemapId)
  params.set('proj', activeProjectState.projection)
  params.set('ter', String(activeProjectState.terrainEnabled))
  params.set('c', activeProjectState.view.center)
  params.set('z', activeProjectState.view.zoom)
  params.set('brg', activeProjectState.view.bearing)
  params.set('pit', activeProjectState.view.pitch)

  if (activeProjectState.family) {
    params.set('var', activeProjectState.family.variable || getDefaultFamilyState(activeProjectId)?.variable || '')
    params.set('prod', activeProjectState.family.product)
    params.set('ens', activeProjectState.family.ensemble)
    params.set('tm', activeProjectState.family.temporalMode)
    params.set('d', activeProjectState.family.date)
    params.set('dt', activeProjectState.family.datetime)
  }

  params.set(
    'lyr',
    getProjectMapLayers(activeProjectId)
      .filter((layer) => activeProjectState.layers[layer.id])
      .map((layer) => layer.id)
      .join(','),
  )

  const selectedStationBookmarkId = getSelectedStationBookmarkId(selectedStation)
  const selectedStationLayerId = selectedStation?.popupOwnerId ?? selectedStation?.layerId ?? null
  const selectedStationLongitude = formatBookmarkCoordinate(selectedStation?.longitude)
  const selectedStationLatitude = formatBookmarkCoordinate(selectedStation?.latitude)

  if (
    selectedStationLayerId
    && selectedStationBookmarkId != null
    && selectedStationLongitude
    && selectedStationLatitude
  ) {
    params.set(
      'pop',
      [
        selectedStationLayerId,
        selectedStationBookmarkId,
        selectedStationLongitude,
        selectedStationLatitude,
      ].join('|'),
    )

    if (selectedStation?.popup?.activeTabId) {
      params.set('tab', selectedStation.popup.activeTabId)
    }

    if (selectedStation?.popup?.forecastProduct) {
      params.set('fprod', selectedStation.popup.forecastProduct)
    }

    if (selectedStation?.popup?.forecastUpdateDate) {
      params.set('fupd', selectedStation.popup.forecastUpdateDate)
    }

    if (selectedStation?.popup?.forecastPostProcessing) {
      params.set('fpp', selectedStation.popup.forecastPostProcessing)
    }
  }

  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

export function parseCenter(centerText) {
  const [longitudeText, latitudeText] = centerText.split(',')
  const longitude = Number.parseFloat(longitudeText)
  const latitude = Number.parseFloat(latitudeText)

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return { longitude: -120.5, latitude: 37.2 }
  }

  return { longitude, latitude }
}

export function parseNumericValue(value, fallback) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function parseIsoDate(dateText) {
  const matchedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? new Date(`${dateText}T00:00:00`) : null
  return matchedDate && !Number.isNaN(matchedDate.getTime()) ? matchedDate : null
}

export function getTemporalModeForTimestep(timestep) {
  const matched = /^(\d+)(hour|day|month)$/.exec(timestep)

  if (!matched) {
    return 'date'
  }

  const [, amountText, unit] = matched
  const amount = Number.parseInt(amountText, 10)

  if (!Number.isFinite(amount)) {
    return 'date'
  }

  return unit === 'hour' && amount < 24 ? 'datetime' : 'date'
}

export function parseTimestep(timestep) {
  const matched = /^(\d+)(hour|day|month)$/.exec(timestep)

  if (!matched) {
    return { amount: 1, unit: 'day' }
  }

  const [, amountText, unit] = matched
  const amount = Number.parseInt(amountText, 10)

  if (!Number.isFinite(amount)) {
    return { amount: 1, unit: 'day' }
  }

  return { amount, unit }
}

export function parseIsoDateTime(datetimeText) {
  const matchedDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datetimeText)
    ? new Date(`${datetimeText}:00`)
    : null
  return matchedDateTime && !Number.isNaN(matchedDateTime.getTime()) ? matchedDateTime : null
}

export function getDatePartFromDateTime(datetimeText, fallbackDate = getDefaultFamilyState()?.date ?? '2026-04-13') {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datetimeText)
    ? datetimeText.slice(0, 10)
    : fallbackDate
}

export function mergeDateIntoDateTime(dateText, datetimeText, fallbackTime = '12:00') {
  const datePart = parseIsoDate(dateText) ? dateText : (getDefaultFamilyState()?.date ?? '2026-04-13')
  const timePart = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datetimeText)
    ? datetimeText.slice(11, 16)
    : fallbackTime

  return `${datePart}T${timePart}`
}

export function formatCoordinate(value) {
  return value.toFixed(4)
}

export function formatViewValue(value, digits = 2) {
  return value.toFixed(digits)
}

export function formatLatLon(value) {
  return value.toFixed(4)
}

export function formatCoordinateLabel(value, positiveLabel, negativeLabel) {
  const absoluteValue = Math.abs(value)
  const direction = value >= 0 ? positiveLabel : negativeLabel
  return `${formatLatLon(absoluteValue)}°${direction}`
}

export function shiftIsoDate(dateText, days) {
  const currentDate = parseIsoDate(dateText)

  if (!currentDate) {
    return dateText
  }

  currentDate.setDate(currentDate.getDate() + days)
  return currentDate.toISOString().slice(0, 10)
}

export function shiftIsoMonth(dateText, months) {
  const currentDate = parseIsoDate(dateText)

  if (!currentDate) {
    return dateText
  }

  const originalDay = currentDate.getDate()
  currentDate.setDate(1)
  currentDate.setMonth(currentDate.getMonth() + months)
  const lastDayOfTargetMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate()
  currentDate.setDate(Math.min(originalDay, lastDayOfTargetMonth))
  return currentDate.toISOString().slice(0, 10)
}

export function formatIsoDateTimeLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function shiftIsoDateTime(datetimeText, days = 0, hours = 0) {
  const currentDate = parseIsoDateTime(datetimeText)

  if (!currentDate) {
    return datetimeText
  }

  currentDate.setHours(currentDate.getHours() + hours)
  currentDate.setDate(currentDate.getDate() + days)
  return formatIsoDateTimeLocal(currentDate)
}

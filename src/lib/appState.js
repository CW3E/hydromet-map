import {
  BASEMAPS,
  DEFAULT_STATE,
  ENSEMBLE_TRACES,
  MAP_LAYERS,
  RASTER_MODELS,
  RASTER_VARIABLES,
} from '../config/mapConfig'

export function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search)
  if (!params.toString()) {
    return DEFAULT_STATE
  }

  const nextState = structuredClone(DEFAULT_STATE)
  const basemapId = params.get('basemap')
  const projection = params.get('projection')
  const terrain = params.get('terrain')
  const center = params.get('center')
  const zoom = params.get('zoom')
  const bearing = params.get('bearing')
  const pitch = params.get('pitch')
  const variable = params.get('variable')
  const model = params.get('model')
  const ensemble = params.get('ensemble')
  const temporalMode = params.get('temporalMode')
  const date = params.get('date')
  const datetime = params.get('datetime')
  const layers = params.get('layers')

  if (BASEMAPS.some((item) => item.id === basemapId)) {
    nextState.basemapId = basemapId
  }

  if (projection === 'globe' || projection === 'mercator') {
    nextState.projection = projection
  }

  if (terrain === 'true' || terrain === 'false') {
    nextState.terrainEnabled = terrain === 'true'
  }

  if (center) {
    nextState.view.center = center
  }

  if (zoom) {
    nextState.view.zoom = zoom
  }

  if (bearing) {
    nextState.view.bearing = bearing
  }

  if (pitch) {
    nextState.view.pitch = pitch
  }

  if (Object.hasOwn(RASTER_VARIABLES, variable)) {
    nextState.raster.variable = variable
  }

  if (RASTER_MODELS.includes(model)) {
    nextState.raster.model = model
  }

  if (ENSEMBLE_TRACES.includes(ensemble)) {
    nextState.raster.ensemble = ensemble
  }

  if (temporalMode === 'date' || temporalMode === 'datetime') {
    nextState.raster.temporalMode = temporalMode
  }

  if (date) {
    nextState.raster.date = date
  }

  if (datetime) {
    nextState.raster.datetime = datetime
  }

  if (layers) {
    const enabledIds = new Set(layers.split(','))
    MAP_LAYERS.forEach((layer) => {
      nextState.layers[layer.id] = enabledIds.has(layer.id)
    })
  }

  return nextState
}

export function writeStateToUrl(state) {
  const params = new URLSearchParams()
  params.set('basemap', state.basemapId)
  params.set('projection', state.projection)
  params.set('terrain', String(state.terrainEnabled))
  params.set('center', state.view.center)
  params.set('zoom', state.view.zoom)
  params.set('bearing', state.view.bearing)
  params.set('pitch', state.view.pitch)
  params.set('variable', state.raster.variable)
  params.set('model', state.raster.model)
  params.set('ensemble', state.raster.ensemble)
  params.set('temporalMode', state.raster.temporalMode)
  params.set('date', state.raster.date)
  params.set('datetime', state.raster.datetime)
  params.set(
    'layers',
    MAP_LAYERS.filter((layer) => state.layers[layer.id])
      .map((layer) => layer.id)
      .join(','),
  )

  const nextUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', nextUrl)
  return window.location.href
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

import { fetchJsonNoCache } from './network'

export const AR_RECON_CATALOG_URL = 'https://cw3e.ucsd.edu/hydro/ar_recon/json/index.json'

const FALLBACK_FLIGHTS = [
  {
    id: '2026-IOP42-NOAA-GIV',
    year: '2026',
    iop: 'IOP42',
    aircraft: 'NOAA-GIV',
    label: 'NOAA G-IV',
    manifestUrl: 'https://cw3e.ucsd.edu/hydro/ar_recon/json/2026/IOP42/NOAA-GIV/manifest.json',
  },
  {
    id: '2026-IOP40-AF309',
    year: '2026',
    iop: 'IOP40',
    aircraft: 'AF309',
    label: 'AF309',
    manifestUrl: 'https://cw3e.ucsd.edu/hydro/ar_recon/json/2026/IOP40/AF309/manifest.json',
  },
]

let catalogPromise = null
const flightPromiseCache = new Map()

function compareFlights(left, right) {
  const yearDifference = Number.parseInt(right.year, 10) - Number.parseInt(left.year, 10)
  if (yearDifference) return yearDifference

  const leftIop = Number.parseInt(left.iop?.replace(/\D/g, ''), 10) || 0
  const rightIop = Number.parseInt(right.iop?.replace(/\D/g, ''), 10) || 0
  if (rightIop !== leftIop) return rightIop - leftIop

  return (right.originTime ?? '').localeCompare(left.originTime ?? '')
    || (left.label ?? left.aircraft).localeCompare(right.label ?? right.aircraft)
}

function normalizeCatalog(catalog, catalogUrl, isFallback = false) {
  const flights = (catalog?.flights ?? [])
    .filter((flight) => flight?.id && flight?.year && flight?.iop && flight?.manifestUrl)
    .map((flight) => ({
      ...flight,
      aircraft: flight.aircraft ?? flight.label ?? flight.id,
      label: flight.label ?? flight.aircraft ?? flight.id,
      manifestUrl: new URL(flight.manifestUrl, catalogUrl).toString(),
    }))
    .sort(compareFlights)

  return {
    schemaVersion: catalog?.schemaVersion ?? '1.0.0',
    sourceUrl: catalogUrl,
    isFallback,
    flights,
  }
}

export function loadArReconCatalog(catalogUrl = AR_RECON_CATALOG_URL) {
  if (!catalogPromise) {
    catalogPromise = fetchJsonNoCache(catalogUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Catalog request failed with HTTP ${response.status}`)
        }
        const catalog = await response.json()
        const normalized = normalizeCatalog(catalog, catalogUrl)
        if (!normalized.flights.length) {
          throw new Error('Catalog did not contain any valid flights')
        }
        return normalized
      })
      .catch(() => normalizeCatalog({ flights: FALLBACK_FLIGHTS }, catalogUrl, true))
  }

  return catalogPromise
}

async function fetchJson(url, signal) {
  const response = await fetchJsonNoCache(url, { signal })
  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}: ${url}`)
  }
  return response.json()
}

async function mapWithConcurrency(items, limit, callback) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await callback(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function fetchArReconFlight(flight, signal) {
  if (!flight?.manifestUrl) {
    throw new Error('The selected flight does not define a manifest URL')
  }

  const manifestUrl = flight.manifestUrl
  const manifest = await fetchJson(manifestUrl, signal)
  const aircraftUrl = new URL(manifest.aircraft.file, manifestUrl).toString()
  const sondeIndexUrl = new URL(manifest.sondes.indexFile, manifestUrl).toString()
  const [aircraft, sondeIndex] = await Promise.all([
    fetchJson(aircraftUrl, signal),
    fetchJson(sondeIndexUrl, signal),
  ])
  const sondes = await mapWithConcurrency(sondeIndex.sondes ?? [], 6, async (item) => {
    const sondeUrl = new URL(item.file, manifestUrl).toString()
    return fetchJson(sondeUrl, signal)
  })

  return {
    flight,
    manifest,
    aircraft,
    sondes,
  }
}

export function loadArReconFlight(flight, { signal } = {}) {
  const cacheKey = flight?.manifestUrl
  if (!cacheKey) {
    return Promise.reject(new Error('The selected flight does not define a manifest URL'))
  }

  if (!flightPromiseCache.has(cacheKey)) {
    const flightPromise = fetchArReconFlight(flight, signal)
      .catch((error) => {
        flightPromiseCache.delete(cacheKey)
        throw error
      })
    flightPromiseCache.set(cacheKey, flightPromise)
  }

  return flightPromiseCache.get(cacheKey)
}

export function getArReconCatalogOptions(catalog) {
  const flights = catalog?.flights ?? []
  const years = [...new Set(flights.map((flight) => flight.year))]
    .sort((left, right) => Number.parseInt(right, 10) - Number.parseInt(left, 10))

  return { flights, years }
}

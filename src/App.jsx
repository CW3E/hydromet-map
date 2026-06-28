import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import 'react-datepicker/dist/react-datepicker.css'
import './App.css'
import {
  BASEMAPS,
  createProjectState,
  DEFAULT_DATETIME,
  DEFAULT_PROJECT_ID,
  getProjectDefinition,
  getProjectLayerFamily,
  PROJECTS,
} from './config/mapConfig'
import MapCanvas from './components/map/MapCanvas'
import {
  getDatePartFromDateTime,
  getTemporalModeForTimestep,
  mergeDateIntoDateTime,
  parseCenter,
  parseNumericValue,
  readStateFromUrl,
  writeStateToUrl,
} from './lib/appState'
import { fetchGradesBinaryDescriptor } from './lib/gradesBinaryData'
import { fetchJsonNoCache } from './lib/network'

const NRT_PRODUCT = 'NRT'
const FORECAST_PRODUCTS = ['WWRF-ECMWF', 'WWRF-GFS', 'GFS']

function formatStatusDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatStatusDateTime(date) {
  const datePart = formatStatusDate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${datePart}T${hours}:${minutes}`
}

function parseStatusTimestamp(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return null
  }

  const normalizedValue = rawValue.trim()
  const parsedDirectly = new Date(normalizedValue)

  if (!Number.isNaN(parsedDirectly.getTime())) {
    return parsedDirectly
  }

  const normalizedUtcValue = normalizedValue
    .replace(' UTC', 'Z')
    .replace(' GMT', 'Z')
    .replace(' ', 'T')
  const parsedNormalizedValue = new Date(normalizedUtcValue)

  return Number.isNaN(parsedNormalizedValue.getTime()) ? null : parsedNormalizedValue
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function buildStatusBoundary(statusTimestamp) {
  const maxForecastTimestamp = addDays(statusTimestamp, 16)

  return {
    statusTimestamp: formatStatusDateTime(statusTimestamp),
    boundaryDate: formatStatusDate(statusTimestamp),
    boundaryDateTime: formatStatusDateTime(statusTimestamp),
    maxDate: formatStatusDate(maxForecastTimestamp),
    maxDateTime: formatStatusDateTime(maxForecastTimestamp),
  }
}

function buildFamilyDateBounds({ minDate, minDateTime, maxDate, maxDateTime }) {
  return {
    minDate: minDate ?? null,
    minDateTime: minDateTime ?? (minDate ? `${minDate}T00:00` : null),
    maxDate: maxDate ?? null,
    maxDateTime: maxDateTime ?? (maxDate ? `${maxDate}T23:59` : null),
  }
}

function getInitialStatusTimestamp() {
  return parseStatusTimestamp(DEFAULT_DATETIME) ?? new Date()
}

function buildInitialStatusBoundaryByProjectId() {
  return Object.fromEntries(
    Object.keys(PROJECTS).map((projectId) => {
      const layerFamily = getProjectLayerFamily(projectId)
      const familySelectors = layerFamily?.selectors ?? {}

      if (layerFamily?.id === 'globalHydro') {
        return [projectId, buildFamilyDateBounds({
          minDate: familySelectors.minDate,
          minDateTime: familySelectors.minDateTime,
          maxDate: familySelectors.defaultDate,
          maxDateTime: familySelectors.defaultDateTime,
        })]
      }

      return [projectId, {
        ...buildStatusBoundary(getInitialStatusTimestamp()),
        ...buildFamilyDateBounds({
          minDate: familySelectors.minDate,
          minDateTime: familySelectors.minDateTime,
        }),
      }]
    }),
  )
}

function getFirstUrlParam(params, ...keys) {
  for (const key of keys) {
    const value = params.get(key)

    if (value !== null) {
      return value
    }
  }

  return null
}

function applyTemporalModeToFamilyState(familyState, layerFamily) {
  if (!familyState || !layerFamily) {
    return familyState
  }

  const familyVariables = layerFamily.raster?.variables ?? {}
  const selectedVariable =
    familyVariables[familyState.variable]
    ?? familyVariables[Object.keys(familyVariables)[0]]

  if (!selectedVariable) {
    return familyState
  }

  const temporalMode = getTemporalModeForTimestep(selectedVariable.timestep)

  if (temporalMode === familyState.temporalMode) {
    return familyState
  }

  return {
    ...familyState,
    date:
      temporalMode === 'date'
        ? getDatePartFromDateTime(familyState.datetime, familyState.date)
        : familyState.date,
    datetime:
      temporalMode === 'datetime'
        ? mergeDateIntoDateTime(familyState.date, familyState.datetime)
        : familyState.datetime,
    temporalMode,
  }
}

function constrainFamilyStateToStatusBoundary(familyState, statusBoundary, layerFamily) {
  if (!familyState) {
    return familyState
  }

  const nextFamily = { ...familyState }
  const familyProducts = layerFamily?.selectors?.products ?? []
  const forecastProducts = familyProducts.filter((product) => product !== NRT_PRODUCT)
  const minDate = statusBoundary?.minDate ?? layerFamily?.selectors?.minDate ?? null
  const minDateTime = statusBoundary?.minDateTime ?? layerFamily?.selectors?.minDateTime ?? null
  const maxDate = statusBoundary?.maxDate ?? layerFamily?.selectors?.maxDate ?? null
  const maxDateTime = statusBoundary?.maxDateTime ?? layerFamily?.selectors?.maxDateTime ?? null

  if (minDate && nextFamily.date < minDate) {
    nextFamily.date = minDate
  }

  if (maxDate && nextFamily.date > maxDate) {
    nextFamily.date = maxDate
  }

  if (minDateTime && nextFamily.datetime < minDateTime) {
    nextFamily.datetime = minDateTime
  }

  if (maxDateTime && nextFamily.datetime > maxDateTime) {
    nextFamily.datetime = maxDateTime
  }

  if (!layerFamily?.selectors?.statusUrl) {
    return nextFamily
  }

  const shouldUseForecastProducts =
    forecastProducts.length > 0
      && (
        nextFamily.temporalMode === 'datetime'
          ? nextFamily.datetime > statusBoundary.boundaryDateTime
          : nextFamily.date > statusBoundary.boundaryDate
      )

  const allowedProducts =
    forecastProducts.length === 0
      ? familyProducts
      : shouldUseForecastProducts
        ? forecastProducts
        : (familyProducts.includes(NRT_PRODUCT) ? [NRT_PRODUCT] : [familyProducts[0]])

  if (allowedProducts.length > 0 && !allowedProducts.includes(nextFamily.product)) {
    nextFamily.product = allowedProducts[0]
  }

  return nextFamily
}

function updateActiveProjectState(current, updater) {
  const activeProjectId = current.activeProjectId ?? DEFAULT_PROJECT_ID
  const activeProjectState = current.projectStateById?.[activeProjectId] ?? createProjectState(activeProjectId)
  const nextProjectState = updater(activeProjectState, activeProjectId)

  if (nextProjectState === activeProjectState) {
    return current
  }

  return {
    ...current,
    projectStateById: {
      ...current.projectStateById,
      [activeProjectId]: nextProjectState,
    },
  }
}

function App() {
  const [appState, setAppState] = useState(() => readStateFromUrl())
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [copyStatus, setCopyStatus] = useState('Copy URL')
  const [selectedStationByProjectId, setSelectedStationByProjectId] = useState({})
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const bookmarkWidgetRef = useRef(null)
  const basemapMenuRef = useRef(null)
  const layerMenuRef = useRef(null)
  const [statusBoundaryByProjectId, setStatusBoundaryByProjectId] = useState(() =>
    buildInitialStatusBoundaryByProjectId(),
  )

  const activeProjectId = appState.activeProjectId ?? DEFAULT_PROJECT_ID
  const selectedStation = selectedStationByProjectId[activeProjectId] ?? null
  const activeProject = getProjectDefinition(activeProjectId)
  const activeProjectState =
    appState.projectStateById?.[activeProjectId] ?? createProjectState(activeProjectId)
  const activeLayerFamily = getProjectLayerFamily(activeProjectId)
  const familyVariables = activeLayerFamily?.raster?.variables ?? {}
  const familyVariableIds = Object.keys(familyVariables)
  const selectedVariable =
    familyVariables[activeProjectState.family?.variable]
    ?? familyVariables[familyVariableIds[0]]
    ?? null
  const selectedBasemap =
    BASEMAPS.find((item) => item.id === activeProjectState.basemapId) ?? BASEMAPS[0]
  const center = parseCenter(activeProjectState.view.center)
  const viewState = {
    longitude: center.longitude,
    latitude: center.latitude,
    zoom: parseNumericValue(activeProjectState.view.zoom, 5.3),
    bearing: parseNumericValue(activeProjectState.view.bearing, 0),
    pitch: parseNumericValue(activeProjectState.view.pitch, 0),
  }
  const terrainEnabled = selectedBasemap.terrainAvailable && activeProjectState.terrainEnabled
  const statusBoundary =
    statusBoundaryByProjectId[activeProjectId]
    ?? buildStatusBoundary(getInitialStatusTimestamp())

  useEffect(() => {
    document.title = activeProject.documentTitle ?? `Hydromet Map - ${activeProject.label}`
  }, [activeProject.documentTitle, activeProject.label])

  useEffect(() => {
    if (copyStatus === 'Copied') {
      const timeoutId = window.setTimeout(() => {
        setCopyStatus('Copy URL')
      }, 1600)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [copyStatus])

  useEffect(() => {
    if (!basemapMenuOpen && !layerMenuOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!basemapMenuRef.current?.contains(event.target)) {
        setBasemapMenuOpen(false)
      }
      if (!layerMenuRef.current?.contains(event.target)) {
        setLayerMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [basemapMenuOpen, layerMenuOpen])

  useEffect(() => {
    const abortController = new AbortController()
    const params = new URLSearchParams(window.location.search)
    const bookmarkedProjectId = getProjectDefinition(getFirstUrlParam(params, 'prj', 'project'))?.id ?? DEFAULT_PROJECT_ID
    const hasExplicitBookmarkedDate = params.has('d') || params.has('date')
    const hasExplicitBookmarkedDateTime = params.has('dt') || params.has('datetime')

    async function loadStatusDefaults() {
      const projectIds = Object.keys(PROJECTS)
      const loadedStatusByProjectId = {}

      await Promise.all(projectIds.map(async (projectId) => {
        const layerFamily = getProjectLayerFamily(projectId)
        const statusUrl = layerFamily?.selectors?.statusUrl
        const statusKey = layerFamily?.selectors?.statusKey

        if (!layerFamily) {
          return
        }

        if (layerFamily.id === 'globalHydro') {
          try {
            const descriptor = await fetchGradesBinaryDescriptor()
            const gradesEndDate = descriptor?.MERIT?.end
            const familySelectors = layerFamily.selectors ?? {}

            if (!gradesEndDate) {
              return
            }

            loadedStatusByProjectId[projectId] = {
              boundary: buildFamilyDateBounds({
                minDate: familySelectors.minDate,
                minDateTime: familySelectors.minDateTime,
                maxDate: gradesEndDate,
                maxDateTime: `${gradesEndDate}T23:59`,
              }),
              date: gradesEndDate,
              datetime: `${gradesEndDate}T12:00`,
            }
          } catch {
            // Keep the built-in defaults if the GRADES descriptor is unavailable.
          }

          return
        }

        if (!statusUrl || !statusKey) {
          return
        }

        try {
          const response = await fetchJsonNoCache(statusUrl, {
            signal: abortController.signal,
          })

          if (!response.ok) {
            return
          }

          const statusData = await response.json()
          const statusTimestamp = parseStatusTimestamp(statusData?.[statusKey])

          if (!statusTimestamp) {
            return
          }

          loadedStatusByProjectId[projectId] = {
            date: formatStatusDate(statusTimestamp),
            datetime: formatStatusDateTime(statusTimestamp),
            boundary: buildStatusBoundary(statusTimestamp),
          }
        } catch (error) {
          if (error?.name !== 'AbortError') {
            // Keep the built-in defaults if the remote status file is unavailable.
          }
        }
      }))

      if (abortController.signal.aborted || Object.keys(loadedStatusByProjectId).length === 0) {
        return
      }

      setStatusBoundaryByProjectId((current) => {
        const next = { ...current }

        Object.entries(loadedStatusByProjectId).forEach(([projectId, statusState]) => {
          if (statusState.boundary) {
            next[projectId] = statusState.boundary
          }
        })

        return next
      })

      setAppState((current) => ({
        ...current,
        projectStateById: Object.fromEntries(
          Object.entries(current.projectStateById).map(([projectId, projectState]) => {
            const layerFamily = getProjectLayerFamily(projectId)
            const loadedStatusState = loadedStatusByProjectId[projectId]

            if (!layerFamily || !projectState.family || !loadedStatusState) {
              return [projectId, projectState]
            }

            const shouldPreserveBookmarkedDate =
              projectId === bookmarkedProjectId && hasExplicitBookmarkedDate
            const shouldPreserveBookmarkedDateTime =
              projectId === bookmarkedProjectId && hasExplicitBookmarkedDateTime

            return [
              projectId,
              {
                ...projectState,
                family: {
                  ...projectState.family,
                  date:
                    shouldPreserveBookmarkedDate
                      ? projectState.family.date
                      : projectState.family.date === layerFamily.selectors?.defaultDate
                      ? loadedStatusState.date
                      : projectState.family.date,
                  datetime:
                    shouldPreserveBookmarkedDateTime
                      ? projectState.family.datetime
                      : projectState.family.datetime === layerFamily.selectors?.defaultDateTime
                      ? loadedStatusState.datetime
                      : projectState.family.datetime,
                },
              },
            ]
          }),
        ),
      }))
    }

    loadStatusDefaults()

    return () => {
      abortController.abort()
    }
  }, [])

  useEffect(() => {
    setAppState((current) => ({
      ...current,
      projectStateById: Object.fromEntries(
        Object.entries(current.projectStateById).map(([projectId, projectState]) => {
          const layerFamily = getProjectLayerFamily(projectId)
          const projectStatusBoundary =
            statusBoundaryByProjectId[projectId]
            ?? buildStatusBoundary(getInitialStatusTimestamp())

          if (!layerFamily || !projectState.family) {
            return [projectId, projectState]
          }

          return [
            projectId,
            {
              ...projectState,
              family: constrainFamilyStateToStatusBoundary(
                applyTemporalModeToFamilyState(projectState.family, layerFamily),
                projectStatusBoundary,
                layerFamily,
              ),
            },
          ]
        }),
      ),
    }))
  }, [statusBoundaryByProjectId])

  function updateTopLevel(key, value) {
    const applyUpdate = () => {
      setAppState((current) =>
        updateActiveProjectState(current, (activeProjectStateValue) => ({
          ...activeProjectStateValue,
          [key]: value,
        })),
      )
    }

    if (key === 'view') {
      startTransition(applyUpdate)
      return
    }

    applyUpdate()
  }

  function updateFamily(key, value) {
    setAppState((current) =>
      updateActiveProjectState(current, (activeProjectStateValue, projectId) => {
        const layerFamily = getProjectLayerFamily(projectId)
        const familyVariablesForProject = layerFamily?.raster?.variables ?? {}

        if (!layerFamily || !activeProjectStateValue.family) {
          return activeProjectStateValue
        }

        const nextFamily = {
          ...activeProjectStateValue.family,
          [key]: value,
        }

        if (key === 'date') {
          nextFamily.datetime = mergeDateIntoDateTime(value, activeProjectStateValue.family.datetime)
        }

        if (key === 'datetime') {
          nextFamily.date = getDatePartFromDateTime(value, activeProjectStateValue.family.date)
        }

        if (key === 'variable') {
          const nextVariable =
            familyVariablesForProject[value]
            ?? familyVariablesForProject[Object.keys(familyVariablesForProject)[0]]
          const nextTemporalMode = getTemporalModeForTimestep(nextVariable?.timestep)
          nextFamily.temporalMode = nextTemporalMode

          if (nextTemporalMode === 'datetime') {
            nextFamily.datetime = mergeDateIntoDateTime(
              activeProjectStateValue.family.date,
              activeProjectStateValue.family.datetime,
            )
          }

          if (nextTemporalMode === 'date') {
            nextFamily.date = getDatePartFromDateTime(
              activeProjectStateValue.family.datetime,
              activeProjectStateValue.family.date,
            )
          }
        }

        return {
          ...activeProjectStateValue,
          family: constrainFamilyStateToStatusBoundary(nextFamily, statusBoundary, layerFamily),
        }
      }),
    )
  }

  function toggleLayer(layerId) {
    setAppState((current) =>
      updateActiveProjectState(current, (activeProjectStateValue) => ({
        ...activeProjectStateValue,
        layers: {
          ...activeProjectStateValue.layers,
          [layerId]: !activeProjectStateValue.layers[layerId],
        },
      })),
    )
  }

  const setSelectedStation = useCallback((nextValue) => {
    const projectId = activeProjectId

    setSelectedStationByProjectId((current) => {
      const currentSelectedStation = current[projectId] ?? null
      const nextSelectedStation =
        typeof nextValue === 'function'
          ? nextValue(currentSelectedStation)
          : nextValue

      if (nextSelectedStation === currentSelectedStation) {
        return current
      }

      if (!nextSelectedStation) {
        if (!Object.hasOwn(current, projectId)) {
          return current
        }

        const {
          [projectId]: _removedSelectedStation,
          ...remainingSelectedStations
        } = current
        return remainingSelectedStations
      }

      return {
        ...current,
        [projectId]: nextSelectedStation,
      }
    })
  }, [activeProjectId])

  function changeProject(nextProjectId) {
    if (nextProjectId === activeProjectId) {
      return
    }

    setAppState((current) => ({
      ...current,
      activeProjectId: nextProjectId,
      projectStateById: {
        ...current.projectStateById,
        [nextProjectId]: current.projectStateById[nextProjectId] ?? createProjectState(nextProjectId),
      },
    }))
  }

  function refreshBookmarkUrl() {
    const nextBookmarkUrl = writeStateToUrl(appState, { selectedStation })
    setBookmarkUrl(nextBookmarkUrl)
    return nextBookmarkUrl
  }

  async function handleCopyBookmark() {
    try {
      const nextBookmarkUrl = refreshBookmarkUrl()
      await navigator.clipboard.writeText(nextBookmarkUrl)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  return (
    <div className="app-shell">
      <main className="map-stage">
        <MapCanvas
          activeProject={activeProject}
          activeProjectId={activeProjectId}
          appState={activeProjectState}
          basemapMenuRef={basemapMenuRef}
          basemapMenuOpen={basemapMenuOpen}
          bookmarkOpen={bookmarkOpen}
          bookmarkWidgetRef={bookmarkWidgetRef}
          copyStatus={copyStatus}
          layerMenuOpen={layerMenuOpen}
          layerMenuRef={layerMenuRef}
          onChangeProject={changeProject}
          onCloseBookmark={() => setBookmarkOpen(false)}
          onCopyBookmark={handleCopyBookmark}
          onToggleBookmark={() => {
            setBookmarkOpen((current) => {
              if (!current) {
                refreshBookmarkUrl()
              }
              return !current
            })
          }}
          bookmarkUrl={bookmarkUrl}
          layerFamily={activeLayerFamily}
          selectedBasemap={selectedBasemap}
          selectedStation={selectedStation}
          selectedVariable={selectedVariable}
          setBasemapMenuOpen={setBasemapMenuOpen}
          setLayerMenuOpen={setLayerMenuOpen}
          setSelectedStation={setSelectedStation}
          statusBoundary={statusBoundary}
          terrainEnabled={terrainEnabled}
          toggleLayer={toggleLayer}
          updateFamily={updateFamily}
          updateTopLevel={updateTopLevel}
          viewState={viewState}
        />
      </main>
    </div>
  )
}

export default App

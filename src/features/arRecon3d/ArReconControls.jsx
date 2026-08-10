import { useEffect, useMemo, useRef, useState } from 'react'
import { getArReconCatalogOptions, loadArReconCatalog } from '../../lib/arReconData'
import { getArReconFlightColor } from './arReconStyle'

function compareIops(left, right) {
  return (Number.parseInt(right.replace(/\D/g, ''), 10) || 0)
    - (Number.parseInt(left.replace(/\D/g, ''), 10) || 0)
}

function flightOptionLabel(flight, siblingFlights) {
  const sameAircraftCount = siblingFlights.filter((item) => item.aircraft === flight.aircraft).length
  const aircraftLabel = flight.label ?? flight.aircraft
  if (sameAircraftCount <= 1) return aircraftLabel
  const start = flight.originTime
    ? new Date(flight.originTime).toISOString().slice(5, 16).replace('T', ' ')
    : ''
  return start ? `${aircraftLabel} · ${start}Z` : `${aircraftLabel} · ${flight.id}`
}

export function ArReconDisplayControls({ familyState, updateFamily }) {
  return (
    <div className="ar-recon-display-controls">
      <select
        aria-label="Vertical exaggeration"
        title="Vertical exaggeration"
        value={familyState.verticalExaggeration}
        onChange={(event) => updateFamily('verticalExaggeration', event.target.value)}
      >
        {[5, 10, 20, 40].map((value) => (
          <option key={value} value={String(value)}>Z ×{value}</option>
        ))}
      </select>

      <label className="ar-recon-toolbar__toggle" title="Show aircraft tracks">
        <input
          type="checkbox"
          checked={familyState.aircraftVisible}
          onChange={(event) => updateFamily('aircraftVisible', event.target.checked)}
        />
        Aircraft
      </label>
      <label className="ar-recon-toolbar__toggle" title="Show dropsonde trajectories">
        <input
          type="checkbox"
          checked={familyState.sondesVisible}
          onChange={(event) => updateFamily('sondesVisible', event.target.checked)}
        />
        Sondes
      </label>
    </div>
  )
}

export default function ArReconControls({ familyState, projection, updateFamily }) {
  const [catalog, setCatalog] = useState(null)
  const flightPickerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadArReconCatalog().then((value) => {
      if (!cancelled) setCatalog(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function closeOnOutsidePointer(event) {
      if (!flightPickerRef.current?.contains(event.target)) {
        flightPickerRef.current?.removeAttribute('open')
      }
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') flightPickerRef.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const { flights, years } = useMemo(() => getArReconCatalogOptions(catalog), [catalog])
  const selectedYear = years.includes(familyState.year) ? familyState.year : years[0]
  const yearFlights = flights.filter((flight) => flight.year === selectedYear)
  const iops = [...new Set(yearFlights.map((flight) => flight.iop))].sort(compareIops)
  const selectedFlightIds = Array.isArray(familyState.selectedFlights)
    ? familyState.selectedFlights
    : (familyState.flight ? [familyState.flight] : [])
  const selectedFlightIdSet = new Set(selectedFlightIds)
  const validFlightIdSet = new Set(flights.map((flight) => flight.id))
  const validSelectedFlightIds = selectedFlightIds.filter((id) => validFlightIdSet.has(id))

  useEffect(() => {
    if (!catalog?.flights.length) return
    const nextYear = selectedYear ?? catalog.flights[0].year
    const nextSelectedFlights = Array.isArray(familyState.selectedFlights)
      ? validSelectedFlightIds
      : (
          validSelectedFlightIds.length
            ? validSelectedFlightIds
            : [catalog.flights.find((flight) => flight.year === nextYear)?.id ?? catalog.flights[0].id]
        )
    if (
      familyState.year !== nextYear
      || !Array.isArray(familyState.selectedFlights)
      || nextSelectedFlights.join(',') !== familyState.selectedFlights.join(',')
    ) {
      updateFamily({ year: nextYear, selectedFlights: nextSelectedFlights })
    }
  }, [
    catalog,
    familyState.selectedFlights,
    familyState.year,
    selectedYear,
    updateFamily,
    validSelectedFlightIds,
  ])

  function toggleFlight(flightId) {
    const nextSelection = selectedFlightIdSet.has(flightId)
      ? selectedFlightIds.filter((id) => id !== flightId)
      : [...selectedFlightIds, flightId]
    updateFamily('selectedFlights', nextSelection)
  }

  if (!catalog) {
    return <div className="ar-recon-toolbar__message">Loading flight catalog…</div>
  }

  return (
    <div className="ar-recon-toolbar">
      <select
        aria-label="AR Recon year"
        title="Year"
        value={selectedYear ?? ''}
        onChange={(event) => updateFamily('year', event.target.value)}
      >
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>

      <details ref={flightPickerRef} className="ar-recon-flight-picker">
        <summary>
          {selectedFlightIds.length === 1 ? '1 flight selected' : `${selectedFlightIds.length} flights selected`}
        </summary>
        <div className="ar-recon-flight-picker__menu">
          <div className="ar-recon-flight-picker__actions">
            <button
              type="button"
              onClick={() => {
                const yearFlightIds = yearFlights.map((flight) => flight.id)
                updateFamily('selectedFlights', [...new Set([...selectedFlightIds, ...yearFlightIds])])
              }}
            >
              Select year
            </button>
            <button type="button" onClick={() => updateFamily('selectedFlights', [])}>Clear</button>
          </div>

          {iops.map((iop) => {
            const iopFlights = yearFlights.filter((flight) => flight.iop === iop)
            return (
              <fieldset key={iop}>
                <legend>{iop}</legend>
                {iopFlights.map((flight) => (
                  <label key={flight.id} className="ar-recon-flight-picker__option">
                    <input
                      type="checkbox"
                      checked={selectedFlightIdSet.has(flight.id)}
                      onChange={() => toggleFlight(flight.id)}
                    />
                    <span
                      className="ar-recon-flight-picker__swatch"
                      style={{ backgroundColor: getArReconFlightColor(flight.id) }}
                      aria-hidden="true"
                    />
                    <span>{flightOptionLabel(flight, iopFlights)}</span>
                  </label>
                ))}
              </fieldset>
            )
          })}
        </div>
      </details>

      <button
        className="ar-recon-toolbar__button ar-recon-toolbar__button--fit"
        type="button"
        disabled={!selectedFlightIds.length}
        aria-label="Zoom to selected flights"
        title="Zoom to selected flights"
        onClick={() => updateFamily('fitRequest', Date.now())}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 9V4h5" />
          <path d="M14 4h2v2" />
          <path d="M4 14v2h2" />
          <circle cx="14" cy="14" r="4.5" />
          <path d="m17.3 17.3 3.2 3.2" />
        </svg>
      </button>

      {catalog.isFallback ? (
        <span className="ar-recon-toolbar__notice" title="Publish index.json to expose all processed flights">
          Sample catalog
        </span>
      ) : null}
      {projection !== 'mercator' ? (
        <span className="ar-recon-toolbar__notice">3D requires Mercator</span>
      ) : null}
    </div>
  )
}

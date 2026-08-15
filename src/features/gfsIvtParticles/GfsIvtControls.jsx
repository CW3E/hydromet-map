import { useEffect, useMemo } from 'react'
import DatePicker from 'react-datepicker'
import { parseIsoDate } from '../../lib/appState'

function formatLocalIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function GfsIvtControls({ catalog, config, familyState, manifest, updateFamily }) {
  const timesteps = manifest?.timesteps ?? []
  const availableDates = useMemo(() => {
    const runDates = (catalog?.runs ?? [])
      .filter((run) => !config?.cycle || run.cycle === config.cycle)
      .map((run) => run.date)
    const manifestDate = manifest?.initializationTime?.slice(0, 10)
    return [...new Set(runDates.length ? runDates : [manifestDate].filter(Boolean))]
      .map(parseIsoDate)
      .filter(Boolean)
  }, [catalog, config?.cycle, manifest?.initializationTime])
  const selectedDate = parseIsoDate(familyState.initializationDate)

  useEffect(() => {
    if (
      timesteps.length
      && !timesteps.some(
        (timestep) => String(timestep.forecastHour) === String(familyState.forecastHour),
      )
    ) {
      updateFamily('forecastHour', String(timesteps[0].forecastHour))
    }
  }, [familyState.forecastHour, timesteps, updateFamily])

  return (
    <div className="ivt-controls" aria-label="GFS IVT North Pacific forecast controls">
      <label className="ivt-controls__date-field">
        <span>Init</span>
        <DatePicker
          selected={selectedDate}
          includeDates={availableDates}
          onChange={(date) => {
            if (date) updateFamily('initializationDate', formatLocalIsoDate(date))
          }}
          dateFormat={`yyyy-MM-dd '${config?.cycle ?? '00'}Z'`}
          disabled={!availableDates.length}
          className="ivt-controls__date"
          title="GFS initialization date"
        />
      </label>
      <label>
        <span>lead</span>
        <select
          value={familyState.forecastHour}
          disabled={!timesteps.length}
          title="GFS forecast hour"
          onChange={(event) => updateFamily('forecastHour', event.target.value)}
        >
          {timesteps.length ? timesteps.map((timestep) => (
            <option key={timestep.forecastHour} value={String(timestep.forecastHour)}>
              {`f${String(timestep.forecastHour).padStart(3, '0')} · ${timestep.validTime.slice(5, 16).replace('T', ' ')}`}
            </option>
          )) : (
            <option value={familyState.forecastHour}>Loading forecast…</option>
          )}
        </select>
      </label>
    </div>
  )
}

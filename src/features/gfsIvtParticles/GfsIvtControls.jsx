export default function GfsIvtControls({ familyState, manifest, updateFamily }) {
  const timesteps = manifest?.timesteps ?? []

  return (
    <div className="ivt-controls" aria-label="GFS IVT North Pacific forecast controls">
      <label>
        <span>GFS IVT</span>
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

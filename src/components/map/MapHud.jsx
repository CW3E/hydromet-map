import DatePicker from 'react-datepicker'
import {
  BASEMAPS,
  ENSEMBLE_TRACES,
  MAP_LAYERS,
  RASTER_MODELS,
  RASTER_VARIABLES,
} from '../../config/mapConfig'
import {
  formatIsoDateTimeLocal,
  getTemporalModeForTimestep,
  parseIsoDate,
  parseIsoDateTime,
  parseTimestep,
  shiftIsoDate,
  shiftIsoDateTime,
  shiftIsoMonth,
} from '../../lib/appState'

export default function MapHud({
  appState,
  basemapMenuOpen,
  layerMenuOpen,
  layerMenuRef,
  selectedBasemap,
  setBasemapMenuOpen,
  setLayerMenuOpen,
  updateRaster,
  updateTopLevel,
  toggleLayer,
}) {
  const selectedRasterVariable = RASTER_VARIABLES[appState.raster.variable] ?? RASTER_VARIABLES.precipitation
  const isDateTimeMode = getTemporalModeForTimestep(selectedRasterVariable.timestep) === 'datetime'
  const shortStep = parseTimestep(selectedRasterVariable.timestep)
  const shortStepLabel = `${shortStep.amount} ${shortStep.unit}${shortStep.amount === 1 ? '' : 's'}`

  return (
    <div className="map-canvas__overlay">
      <div className="scene-tools">
        <div
          className={basemapMenuOpen ? 'basemap-switcher is-open' : 'basemap-switcher'}
          title={selectedBasemap.description}
          onMouseEnter={() => setBasemapMenuOpen(true)}
          onMouseLeave={() => setBasemapMenuOpen(false)}
        >
          <button
            className="choice-card choice-card--current is-active"
            type="button"
            aria-label={`Current basemap: ${selectedBasemap.label}`}
          >
            <strong>{selectedBasemap.label}</strong>
          </button>

          <div className="basemap-switcher__menu">
            {BASEMAPS.map((basemap) => (
              <button
                key={basemap.id}
                className={basemap.id === appState.basemapId ? 'choice-card is-active' : 'choice-card'}
                onClick={() => {
                  updateTopLevel('basemapId', basemap.id)
                  if (!basemap.terrainAvailable && appState.terrainEnabled) {
                    updateTopLevel('terrainEnabled', false)
                  }
                  setBasemapMenuOpen(false)
                }}
                type="button"
                title={basemap.description}
              >
                <strong>{basemap.label}</strong>
              </button>
            ))}
          </div>
        </div>

        <div ref={layerMenuRef} className={layerMenuOpen ? 'layer-toggle is-open' : 'layer-toggle'}>
          <button
            className="scene-icon-button"
            type="button"
            aria-label="Layer toggles"
            title="Layer toggles"
            onClick={() => setLayerMenuOpen((current) => !current)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 4 4.5 8 12 12 19.5 8 12 4Z" />
              <path d="M4.5 11.5 12 15.5l7.5-4" />
              <path d="M4.5 15 12 19l7.5-4" />
            </svg>
          </button>

          <div className="layer-toggle__menu">
            {MAP_LAYERS.map((layer) => (
              <label key={layer.id} className="layer-row" title={layer.description}>
                <strong>{layer.label}</strong>
                <input
                  type="checkbox"
                  checked={appState.layers[layer.id]}
                  onChange={() => toggleLayer(layer.id)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="date-row date-row--map">
          {isDateTimeMode ? (
            <>
              <button
                className="date-icon-button date-icon-button--day"
                type="button"
                aria-label="Previous day"
                title="-1 day"
                onClick={() => {
                  updateRaster('datetime', shiftIsoDateTime(appState.raster.datetime, -1, 0))
                }}
              >
                <span aria-hidden="true">{'<<'}</span>
              </button>

              <button
                className="date-icon-button date-icon-button--hour"
                type="button"
                aria-label="Previous hour"
                title={`-${shortStepLabel}`}
                onClick={() => {
                  updateRaster('datetime', shiftIsoDateTime(appState.raster.datetime, 0, -shortStep.amount))
                }}
              >
                <span aria-hidden="true">{'<'}</span>
              </button>

              <label className="date-field date-field--datetime">
                <DatePicker
                  calendarClassName="hydromet-datepicker__calendar"
                  className="hydromet-datepicker__input"
                  dateFormat="yyyy-MM-dd HH:mm"
                  placeholderText="YYYY-MM-DD HH:mm"
                  popperPlacement="bottom-start"
                  selected={parseIsoDateTime(appState.raster.datetime)}
                  showTimeSelect
                  timeCaption="Time"
                  timeFormat="HH:mm"
                  timeIntervals={60}
                  onChange={(date) => {
                    if (date) {
                      updateRaster('datetime', formatIsoDateTimeLocal(date))
                    }
                  }}
                />
              </label>

              <button
                className="date-icon-button date-icon-button--hour-next"
                type="button"
                aria-label="Next hour"
                title={`+${shortStepLabel}`}
                onClick={() => {
                  updateRaster('datetime', shiftIsoDateTime(appState.raster.datetime, 0, shortStep.amount))
                }}
              >
                <span aria-hidden="true">{'>'}</span>
              </button>

              <button
                className="date-icon-button date-icon-button--day-next"
                type="button"
                aria-label="Next day"
                title="+1 day"
                onClick={() => {
                  updateRaster('datetime', shiftIsoDateTime(appState.raster.datetime, 1, 0))
                }}
              >
                <span aria-hidden="true">{'>>'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="date-icon-button"
                type="button"
                aria-label="One month before"
                title="-1 month"
                onClick={() => {
                  updateRaster('date', shiftIsoMonth(appState.raster.date, -1))
                }}
              >
                <span aria-hidden="true">{'<<'}</span>
              </button>

              <button
                className="date-icon-button"
                type="button"
                aria-label="Previous day"
                title="-1 day"
                onClick={() => {
                  updateRaster('date', shiftIsoDate(appState.raster.date, -1))
                }}
              >
                <span aria-hidden="true">{'<'}</span>
              </button>

              <label className="date-field">
                <DatePicker
                  calendarClassName="hydromet-datepicker__calendar"
                  className="hydromet-datepicker__input"
                  dateFormat="yyyy-MM-dd"
                  placeholderText="YYYY-MM-DD"
                  popperPlacement="bottom-start"
                  selected={parseIsoDate(appState.raster.date)}
                  onChange={(date) => {
                    if (date) {
                      updateRaster('date', date.toISOString().slice(0, 10))
                    }
                  }}
                />
              </label>

              <button
                className="date-icon-button"
                type="button"
                aria-label="Next day"
                title="+1 day"
                onClick={() => {
                  updateRaster('date', shiftIsoDate(appState.raster.date, 1))
                }}
              >
                <span aria-hidden="true">{'>'}</span>
              </button>

              <button
                className="date-icon-button"
                type="button"
                aria-label="One month after"
                title="+1 month"
                onClick={() => {
                  updateRaster('date', shiftIsoMonth(appState.raster.date, 1))
                }}
              >
                <span aria-hidden="true">{'>>'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="raster-toolbar">
        <select
          value={appState.raster.variable}
          title="Raster variable"
          onChange={(event) => updateRaster('variable', event.target.value)}
        >
          {Object.entries(RASTER_VARIABLES).map(([value, item]) => (
            <option key={value} value={value}>
              {`${item.label} (${item.timestep})`}
            </option>
          ))}
        </select>

        <select
          value={appState.raster.model}
          title="Forecast model"
          onChange={(event) => updateRaster('model', event.target.value)}
        >
          {RASTER_MODELS.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>

        <select
          value={appState.raster.ensemble}
          title="Ensemble trace"
          onChange={(event) => updateRaster('ensemble', event.target.value)}
        >
          {ENSEMBLE_TRACES.map((trace) => (
            <option key={trace} value={trace}>
              {trace}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

import DatePicker from 'react-datepicker'
import {
  BASEMAPS,
  getProjectMapLayers,
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
  activeProject,
  appState,
  basemapMenuRef,
  basemapMenuOpen,
  layerMenuOpen,
  layerMenuRef,
  layerFamily,
  selectedBasemap,
  setBasemapMenuOpen,
  setLayerMenuOpen,
  statusBoundary,
  updateFamily,
  updateTopLevel,
  toggleLayer,
}) {
  const projectLayers = getProjectMapLayers(activeProject?.id)
  const familyVariables = layerFamily?.raster?.variables ?? {}
  const familyVariableIds = Object.keys(familyVariables)
  const selectedRasterVariable =
    familyVariables[appState.family?.variable] ?? familyVariables[familyVariableIds[0]] ?? null
  const familyProducts = layerFamily?.selectors?.products ?? []
  const familyProductLabels = layerFamily?.selectors?.productLabels ?? {}
  const ensembleTraces = layerFamily?.selectors?.ensembleTraces ?? []
  const hasFamilyDateSelector = Boolean(layerFamily?.selectors?.dateSelector || selectedRasterVariable)
  const hasVariableSelector = familyVariableIds.length > 0
  const hasProductSelector = familyProducts.length > 0
  const hasEnsembleSelector = ensembleTraces.length > 1
  const showFamilyToolbar = hasVariableSelector || hasProductSelector || hasEnsembleSelector
  const isDateTimeMode =
    selectedRasterVariable
      ? getTemporalModeForTimestep(selectedRasterVariable.timestep) === 'datetime'
      : appState.family?.temporalMode === 'datetime'
  const shortStep = parseTimestep(selectedRasterVariable?.timestep ?? layerFamily?.selectors?.timeStep ?? '1day')
  const shortStepLabel = `${shortStep.amount} ${shortStep.unit}${shortStep.amount === 1 ? '' : 's'}`
  const forecastProducts = familyProducts.filter((product) => product !== 'NRT')
  const allowsForecastProducts = selectedRasterVariable
    ? (
        isDateTimeMode
          ? appState.family.datetime > statusBoundary.boundaryDateTime
          : appState.family.date > statusBoundary.boundaryDate
      )
    : false
  const allowedProducts =
    !layerFamily
      ? []
      : forecastProducts.length === 0
        ? familyProducts
        : (allowsForecastProducts ? forecastProducts : ['NRT'])
  const allowedProductSet = new Set(allowedProducts)
  const isForecastProduct = appState.family?.product !== 'NRT'
  const activeRasterLayerId = layerFamily?.raster?.layerId
  const minPickerDate = parseIsoDate(statusBoundary.minDate)
  const maxPickerDate = parseIsoDate(statusBoundary.maxDate)
  const minPickerDateTime = parseIsoDateTime(statusBoundary.minDateTime)
  const maxPickerDateTime = parseIsoDateTime(statusBoundary.maxDateTime)
  const selectedDateTime = parseIsoDateTime(appState.family?.datetime ?? '')
  const isSelectedOnMinDate =
    selectedDateTime &&
    minPickerDateTime &&
    selectedDateTime.toDateString() === minPickerDateTime.toDateString()
  const isSelectedOnMaxDate =
    selectedDateTime &&
    maxPickerDateTime &&
    selectedDateTime.toDateString() === maxPickerDateTime.toDateString()
  const minTime = isSelectedOnMinDate ? minPickerDateTime : undefined
  const maxTime = isSelectedOnMaxDate ? maxPickerDateTime : undefined

  return (
    <div className="map-canvas__overlay">
      <div className="scene-tools">
        <div
          ref={basemapMenuRef}
          className={basemapMenuOpen ? 'basemap-switcher is-open' : 'basemap-switcher'}
          title={selectedBasemap.description}
        >
          <button
            className="choice-card choice-card--current is-active"
            type="button"
            aria-label={`Current basemap: ${selectedBasemap.label}`}
            onClick={() => setBasemapMenuOpen((current) => !current)}
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
            {projectLayers.map((layer) => {
              const symbolColor =
                layer.id === activeRasterLayerId && selectedRasterVariable
                  ? selectedRasterVariable.palette.colors.at(-1) ?? '#1d6996'
                  : layer.symbolColor ?? '#4a7189'

              return (
                <label
                  key={layer.id}
                  className={appState.layers[layer.id] ? 'layer-row is-on' : 'layer-row is-off'}
                  title={layer.description}
                >
                  <strong className="layer-row__label">
                    <span className="layer-row__symbol" style={{ color: symbolColor }}>
                      {layer.symbol ?? '\u25A1'}
                    </span>
                    <span>{layer.label}</span>
                  </strong>
                  <input
                    type="checkbox"
                    checked={appState.layers[layer.id]}
                    onChange={() => toggleLayer(layer.id)}
                  />
                </label>
              )
            })}
          </div>
        </div>

        {layerFamily && appState.family && hasFamilyDateSelector ? (
          <div className="date-row date-row--map">
            {isDateTimeMode ? (
              <>
                <button
                  className="date-icon-button date-icon-button--day"
                  type="button"
                  aria-label="Previous day"
                  title="-1 day"
                  onClick={() => {
                    updateFamily('datetime', shiftIsoDateTime(appState.family.datetime, -1, 0))
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
                    updateFamily('datetime', shiftIsoDateTime(appState.family.datetime, 0, -shortStep.amount))
                  }}
                >
                  <span aria-hidden="true">{'<'}</span>
                </button>

                <label className="date-field date-field--datetime">
                  <DatePicker
                    calendarClassName="hydromet-datepicker__calendar"
                    className="hydromet-datepicker__input"
                    dateFormat="yyyy-MM-dd HH:mm"
                    minDate={minPickerDate}
                    minTime={minTime}
                    maxDate={maxPickerDate}
                    maxTime={maxTime}
                    placeholderText="YYYY-MM-DD HH:mm"
                    popperPlacement="bottom-start"
                    selected={parseIsoDateTime(appState.family.datetime)}
                    showTimeSelect
                    timeCaption="Time"
                    timeFormat="HH:mm"
                    timeIntervals={60}
                    onChange={(date) => {
                      if (date) {
                        updateFamily('datetime', formatIsoDateTimeLocal(date))
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
                    updateFamily('datetime', shiftIsoDateTime(appState.family.datetime, 0, shortStep.amount))
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
                    updateFamily('datetime', shiftIsoDateTime(appState.family.datetime, 1, 0))
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
                    updateFamily('date', shiftIsoMonth(appState.family.date, -1))
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
                    updateFamily('date', shiftIsoDate(appState.family.date, -1))
                  }}
                >
                  <span aria-hidden="true">{'<'}</span>
                </button>

                <label className="date-field">
                  <DatePicker
                    calendarClassName="hydromet-datepicker__calendar"
                    className="hydromet-datepicker__input"
                    dateFormat="yyyy-MM-dd"
                    minDate={minPickerDate}
                    maxDate={maxPickerDate}
                    placeholderText="YYYY-MM-DD"
                    popperPlacement="bottom-start"
                    selected={parseIsoDate(appState.family.date)}
                    onChange={(date) => {
                      if (date) {
                        updateFamily('date', date.toISOString().slice(0, 10))
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
                    updateFamily('date', shiftIsoDate(appState.family.date, 1))
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
                    updateFamily('date', shiftIsoMonth(appState.family.date, 1))
                  }}
                >
                  <span aria-hidden="true">{'>>'}</span>
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="raster-toolbar">
        {layerFamily && appState.family && showFamilyToolbar ? (
          <>
            {hasVariableSelector ? (
              <select
                value={appState.family.variable}
                title="Raster variable"
                onChange={(event) => updateFamily('variable', event.target.value)}
              >
                {Object.entries(familyVariables).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}

            {hasProductSelector ? (
              <select
                className={isForecastProduct ? 'raster-toolbar__select raster-toolbar__select--forecast' : 'raster-toolbar__select'}
                value={appState.family.product}
                title="Raster product"
                onChange={(event) => updateFamily('product', event.target.value)}
              >
                {familyProducts.map((product) => (
                  <option key={product} value={product} disabled={!allowedProductSet.has(product)}>
                    {familyProductLabels[product] ?? product}
                  </option>
                ))}
              </select>
            ) : null}

            {hasEnsembleSelector ? (
              <select
                value={appState.family.ensemble}
                title="Ensemble trace"
                onChange={(event) => updateFamily('ensemble', event.target.value)}
              >
                {ensembleTraces.map((trace) => (
                  <option key={trace} value={trace}>
                    {trace}
                  </option>
                ))}
              </select>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

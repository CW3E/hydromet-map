export default function MapLegend({ compactUnits = false, palette, units, variableLabel }) {
  const colors = palette.colors.slice().reverse()
  const thresholds = palette.thresholds.slice().reverse()

  return (
    <div className={compactUnits ? 'map-legend map-legend--compact-units' : 'map-legend'}>
      <div className={compactUnits ? 'legend-card legend-card--map legend-card--compact-units' : 'legend-card legend-card--map'}>
        <div className="legend-card__header legend-card__header--map">
          <span>{units}</span>
        </div>
        <div className="legend-scale legend-scale--threshold">
          <div className="legend-scale__bar">
            {colors.map((color, index) => (
              <span
                key={`${variableLabel}-color-${color}-${index}`}
                className="legend-scale__segment"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div
            className="legend-scale__labels"
            style={{ '--legend-segment-count': colors.length }}
          >
            {thresholds.map((threshold, index) => (
              <small
                key={`${variableLabel}-threshold-${threshold}-${index}`}
                style={{ gridRowStart: index + 2 }}
              >
                {threshold}
              </small>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

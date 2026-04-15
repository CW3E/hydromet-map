export default function MapLegend({ palette, units, variableLabel }) {
  const colors = palette.colors.slice().reverse()
  const thresholds = palette.thresholds.slice().reverse()

  return (
    <div className="map-legend">
      <div className="legend-card legend-card--map">
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
            style={{ '--legend-threshold-count': thresholds.length }}
          >
            {thresholds.map((threshold, index) => (
              <small key={`${variableLabel}-threshold-${threshold}-${index}`}>{threshold}</small>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

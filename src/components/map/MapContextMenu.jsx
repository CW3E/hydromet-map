import { formatCoordinateLabel } from '../../lib/appState'

export default function MapContextMenu({
  actions,
  latitude,
  longitude,
  menuRef,
  onClose,
  x,
  y,
}) {
  return (
    <div
      ref={menuRef}
      className="map-context-menu"
      role="menu"
      aria-label="Map actions"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      onContextMenu={(event) => event.preventDefault()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div className="map-context-menu__header">
        <strong>Map actions</strong>
        <button
          className="map-context-menu__close"
          type="button"
          aria-label="Close map actions"
          onClick={onClose}
        >
          x
        </button>
      </div>

      <div className="map-context-menu__coords">
        <span>{formatCoordinateLabel(latitude, 'N', 'S')}</span>
        <span>{formatCoordinateLabel(longitude, 'E', 'W')}</span>
      </div>

      <div className="map-context-menu__actions">
        {actions.map((action) => (
          <button
            key={action.id}
            className="map-context-menu__action"
            type="button"
            disabled={action.disabled}
            onClick={action.onSelect}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

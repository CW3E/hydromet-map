import { createPortal } from 'react-dom'

export default function MapToolDialog({
  actions,
  children,
  eyebrow = 'Map Tool',
  onClose,
  open,
  title,
}) {
  if (!open) {
    return null
  }

  return createPortal(
    <>
      <div className="map-tool-dialog-backdrop" onClick={onClose} />
      <div className="map-tool-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="map-tool-dialog__header">
          <div>
            <p className="map-canvas__eyebrow">{eyebrow}</p>
            <strong>{title}</strong>
          </div>
          <button className="map-tool-dialog__close" type="button" aria-label="Close dialog" onClick={onClose}>
            x
          </button>
        </div>

        <div className="map-tool-dialog__body">{children}</div>

        {actions?.length ? (
          <div className="map-tool-dialog__actions">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={action.variant === 'secondary' ? 'map-tool-dialog__button map-tool-dialog__button--secondary' : 'map-tool-dialog__button'}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  )
}

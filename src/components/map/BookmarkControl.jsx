import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'

export default function BookmarkControl({
  bookmarkUrl,
  bookmarkOpen,
  bookmarkWidgetRef,
  copyStatus,
  onClose,
  onCopy,
  onToggle,
}) {
  return (
    <div ref={bookmarkWidgetRef} className="bookmark-widget">
      <button
        className="bookmark-trigger"
        type="button"
        title="Bookmark this map"
        onClick={onToggle}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M6.75 3.75h10.5v16.5l-5.25-3.75-5.25 3.75Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </button>

      {bookmarkOpen
        ? createPortal(
            <>
              <div className="bookmark-backdrop" onClick={onClose} />
              <div className="bookmark-popup" role="dialog" aria-modal="true" aria-label="Share this map view">
                <div className="bookmark-popup__header">
                  <div>
                    <p className="map-canvas__eyebrow">Bookmark</p>
                    <strong>Share map view</strong>
                  </div>
                  <button className="bookmark-popup__close" type="button" onClick={onClose}>
                    x
                  </button>
                </div>

                <div className="bookmark-popup__body">
                  {bookmarkUrl ? (
                    <div className="bookmark-popup__qr-code" aria-label="QR code for current map bookmark">
                      <QRCodeSVG
                        value={bookmarkUrl}
                        size={200}
                        marginSize={1}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  ) : (
                    <div className="bookmark-popup__qr-status" aria-live="polite">
                      Generating QR code...
                    </div>
                  )}
                  <div className="bookmark-popup__content">
                    <button type="button" onClick={onCopy}>
                      {copyStatus}
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}

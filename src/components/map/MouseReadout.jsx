import { forwardRef, useImperativeHandle, useRef } from 'react'
import { formatCoordinateLabel } from '../../lib/appState'

const MouseReadout = forwardRef(function MouseReadout(_, ref) {
  const textRef = useRef(null)

  useImperativeHandle(ref, () => ({
    setCoordinates(longitude, latitude) {
      if (textRef.current) {
        textRef.current.textContent = `${formatCoordinateLabel(latitude, 'N', 'S')}, ${formatCoordinateLabel(longitude, 'E', 'W')}`
      }
    },
    clear() {
      if (textRef.current) {
        textRef.current.textContent = 'Move cursor'
      }
    },
  }), [])

  return (
    <div className="mouse-readout">
      <span ref={textRef}>Move cursor</span>
    </div>
  )
})

export default MouseReadout

export const AR_RECON_FLIGHT_COLORS = [
  '#ffbd3e',
  '#33d6ff',
  '#ff6b8a',
  '#82e36f',
  '#b78cff',
  '#ff8f4c',
  '#55a7ff',
  '#f26be2',
]

export function getArReconFlightColor(flightId) {
  let hash = 0
  for (let index = 0; index < flightId.length; index += 1) {
    hash = ((hash * 31) + flightId.charCodeAt(index)) >>> 0
  }
  return AR_RECON_FLIGHT_COLORS[hash % AR_RECON_FLIGHT_COLORS.length]
}

export function getArReconFlightLabel(flight) {
  return `${flight.iop} · ${flight.label ?? flight.aircraft}`
}

export function getArReconFlightDate(flight, manifest) {
  const timestamp = flight.originTime ?? manifest?.originTime
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

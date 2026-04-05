export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

function toRad(deg: number): number { return deg * (Math.PI / 180) }

export function isWithinRadius(centerLat: number, centerLng: number, pointLat: number, pointLng: number, radiusKm: number): boolean {
  return calculateDistance(centerLat, centerLng, pointLat, pointLng) <= radiusKm
}

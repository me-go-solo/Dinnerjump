export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} minuten`
  if (mins === 0) return `${hours} uur`
  return `${hours} uur en ${mins} minuten`
}

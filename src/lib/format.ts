export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (rest === 0) return `${h}h`
  return `${h}h ${rest}m`
}

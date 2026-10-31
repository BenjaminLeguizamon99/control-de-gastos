// shortcut: zona AR fija; pasar a la zona del dispositivo solo si se usa fuera de Argentina
const TZ = 'America/Argentina/Buenos_Aires'
const FMT = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

// No usar toISOString() para "hoy": desde las 21:00 ART ya da mañana (UTC)
export function hoyART(now = new Date()): string {
  const p = Object.fromEntries(FMT.formatToParts(now).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}

export function ayer(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

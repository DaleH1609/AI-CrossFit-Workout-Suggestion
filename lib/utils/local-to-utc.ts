/**
 * DST-safe conversion of (localDate, localTime, timezone) → UTC ISO string.
 *
 * Strategy: guess UTC by pretending the local time is already UTC, measure
 * what that guess looks like in the target timezone, compute the offset, and
 * apply it. Repeat once more to correct for DST boundaries that landed inside
 * the first correction (which can shift the guess across a DST transition).
 */
export function localToUTC(dateStr: string, localTime: string, timezone: string): string | null {
  const [hh, mm] = localTime.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null

  const targetLocalMs = Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    hh,
    mm,
    0,
    0
  )
  if (Number.isNaN(targetLocalMs)) return null

  function tzOffsetMsAt(utcMs: number): number {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    })
    const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map(p => [p.type, p.value]))
    const asIfUtcMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second)
    )
    return asIfUtcMs - utcMs
  }

  // First pass: guess offset using targetLocalMs as a UTC probe.
  let offset = tzOffsetMsAt(targetLocalMs)
  let utcMs = targetLocalMs - offset
  // Second pass: re-measure offset at the corrected point to settle DST.
  offset = tzOffsetMsAt(utcMs)
  utcMs = targetLocalMs - offset

  return new Date(utcMs).toISOString()
}

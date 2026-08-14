// ─────────────────────────────────────────────────────────────────────
// Calendar helpers.
//
// Events are now loaded from Strapi via `useCalendarEvents` (seminars,
// competitions, scheduled exams). The shape below is the contract the UI
// components (EventCard / EventModal) rely on:
//
//   {
//     id, type: 'competition' | 'seminar' | 'exam',
//     startDate: 'YYYY-MM-DD',          // always
//     endDate: 'YYYY-MM-DD' | undefined // set → multi-day event
//     time: 'HH:MM' | undefined,        // single-day events only
//     title,                            // plain string (single-language)
//     location,                         // plain string — joined {address, city, country}
//     descriptionLv, descriptionRu, descriptionEn,
//     questionCount: number | undefined, // exams only
//     passingScore: number | undefined,  // exams only
//   }
// ─────────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0')

/** Parse an ISO 'YYYY-MM-DD' string as a LOCAL date (no timezone surprises). */
export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** '2026-03' group key for a Date. */
export function monthKeyOf(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

/**
 * Group events into ordered month sections.
 * Returns [{ key: '2026-03', year, month (0-11), events }] sorted ascending.
 */
export function groupEventsByMonth(items) {
  const map = new Map()
  for (const ev of items) {
    const date = parseDate(ev.startDate)
    const key = monthKeyOf(date)
    if (!map.has(key)) {
      map.set(key, { key, year: date.getFullYear(), month: date.getMonth(), events: [] })
    }
    map.get(key).events.push(ev)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

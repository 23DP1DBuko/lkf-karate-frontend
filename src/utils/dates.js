// dates.js — one date/time formatter for the whole app.
// `toLocaleString()` prints seconds and its output varies between browsers, so
// exam windows and timestamps go through this instead: DD.MM.YYYY, HH:mm
// (locale-ordered, 24-hour, never seconds).
export function formatDateTime(value, locale) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale || undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

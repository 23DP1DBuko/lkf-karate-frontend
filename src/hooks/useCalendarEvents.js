import { useQuery } from '@tanstack/react-query'
import api from '../api/strapi'

const PAGE = 'pagination[page]=1&pagination[pageSize]=200'

// Strapi time fields come back as HH:mm:ss.SSS — the calendar only needs HH:mm.
const fmtTime = (v) => (v || '').slice(0, 5)

// Place is stored as { country, city, address } — join into one display string.
// Legacy rows stored { lv, ru, en } — fall back to lv so old events still show.
const formatPlace = (place = {}) =>
  [place.address, place.city, place.country].filter(Boolean).join(', ') || place.lv || place.en || ''

/**
 * Map a Strapi seminar to the event contract used by EventCard/EventModal.
 * Only published entries are returned by the plain GET, so drafts never leak.
 */
const mapSeminar = (sem) => {
  if (!sem.date) return null
  const time = [fmtTime(sem.time_from), fmtTime(sem.time_to)].filter(Boolean).join(' – ')
  // Online seminars have no physical place — the UI renders “Online” instead
  // of an empty address block. meetingUrl and topics are optional extras.
  const isOnline = !!sem.isOnline
  return {
    id: `seminar-${sem.documentId}`,
    type: 'seminar',
    startDate: sem.date,
    time: time || undefined,
    title: sem.title || '',
    isOnline,
    location: isOnline ? undefined : formatPlace(sem.place) || undefined,
    meetingUrl: sem.meetingUrl || null,
    topics: Array.isArray(sem.topics) ? sem.topics : [],
  }
}

const mapCompetition = (comp) => {
  if (!comp.date_from) return null
  return {
    id: `competition-${comp.documentId}`,
    type: 'competition',
    startDate: comp.date_from,
    endDate: comp.date_to && comp.date_to !== comp.date_from ? comp.date_to : undefined,
    title: comp.title || '',
    location: formatPlace(comp.place),
  }
}

// Exam openAt is a UTC ISO datetime — format as the LOCAL date/time so the
// calendar matches what the admin picked (a late-evening exam must not land
// on the previous UTC day).
const mapExam = (exam) => {
  if (!exam.openAt) return null
  const d = new Date(exam.openAt)
  if (Number.isNaN(d.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  return {
    id: `exam-${exam.documentId}`,
    type: 'exam',
    startDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    title: exam.title || '',
    questionCount: exam.questionCount ?? 0,
    passingScore: exam.passingScore ?? 0,
  }
}

/**
 * Load calendar events from Strapi: published seminars + competitions and
 * scheduled exams (openAt set). Pass `{ types: ['competition'] }` to fetch
 * a subset — used by the landing-page competitions-only calendar.
 */
export function useCalendarEvents({ types } = {}) {
  const wanted = types && types.length ? types : ['seminar', 'competition', 'exam']
  return useQuery({
    queryKey: ['calendar-events', wanted],
    queryFn: async () => {
      const fetchType = {
        seminar: () => api.get(`/seminars?${PAGE}`).then(r => r.data.data || []).then((list) => list.map(mapSeminar)),
        competition: () => api.get(`/competitions?${PAGE}`).then(r => r.data.data || []).then((list) => list.map(mapCompetition)),
        exam: () => api.get(`/exams?${PAGE}`).then(r => r.data.data || []).then((list) => list.map(mapExam)),
      }
      const results = await Promise.all(wanted.map((type) => fetchType[type]?.() ?? Promise.resolve([])))
      return results.flat().filter(Boolean)
    },
  })
}

import { useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { parseDate } from '../data/events'
import EventCard from './EventCard'
import EventModal from './EventModal'
import EventEmptyState from './EventEmptyState'
import { SkeletonCard } from './Skeleton'
import { useCalendarEvents } from '../hooks/useCalendarEvents'

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const pad = (n) => String(n).padStart(2, '0')
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** '10. marts, 2026' style date, localized via i18n month keys. */
function formatDate(i18n, t, d) {
  const month = t(`events.months.${MONTH_KEYS[d.getMonth()]}`)
  if (i18n.language === 'en') return `${month} ${d.getDate()}, ${d.getFullYear()}`
  return `${d.getDate()}. ${month} ${d.getFullYear()}`
}

/**
 * Landing-page "Competitions" calendar — a compact month grid with marked
 * dates. Competitions only (seminars are judges-only). Desktop layout: small
 * calendar on the left, the selected day's competitions on the right so the
 * section stays compact; on mobile the two stack as before.
 */
export default function LandingCompetitionsCalendar({ isDark }) {
  const { t, i18n } = useTranslation()
  const [view, setView] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  // Explicitly picked day as a 'YYYY-MM-DD' key — null = rely on the auto pick
  const [picked, setPicked] = useState(null)
  const [selected, setSelected] = useState(null)
  const closeModal = useCallback(() => setSelected(null), [])

  const { data: competitions, isLoading, isError, refetch } = useCalendarEvents({ types: ['competition'] })

  // dateKey -> competitions (multi-day events mark every day in their range)
  const byDate = useMemo(() => {
    const map = new Map()
    for (const comp of competitions || []) {
      const start = parseDate(comp.startDate)
      const end = comp.endDate ? parseDate(comp.endDate) : start
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = dateKey(d)
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(comp)
      }
    }
    return map
  }, [competitions])

  // Monday-first grid with leading/trailing blanks to complete full weeks
  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const lead = (first.getDay() + 6) % 7 // JS: 0=Sun..6=Sat → 0=Mon
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const out = Array(lead).fill(null)
    for (let d = 1; d <= daysInMonth; d += 1) {
      out.push(new Date(view.getFullYear(), view.getMonth(), d))
    }
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [view])

  const todayKey = dateKey(new Date())
  const monthPrefix = dateKey(view).slice(0, 7)
  const monthLabel = `${view.getFullYear()} ${t(`events.months.${MONTH_KEYS[view.getMonth()]}`)}`

  // Pure derivation (no effect): auto-pick a useful day within the visible
  // month — today if marked, else the first marked day at/after today,
  // else the month's first marked day.
  const autoKey = useMemo(() => {
    if (!cells.some((d) => d && byDate.has(dateKey(d)))) return null
    if (byDate.has(todayKey) && todayKey.startsWith(monthPrefix)) return todayKey
    const marked = cells
      .filter(Boolean)
      .map(dateKey)
      .filter((k) => byDate.has(k))
      .sort()
    return marked.find((k) => k >= todayKey) || marked[0] || null
  }, [byDate, cells, monthPrefix, todayKey])

  const activeKey = picked?.key ?? autoKey
  const shift = (delta) => {
    setView((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    setPicked(null)
  }

  const selectedComps = activeKey ? byDate.get(activeKey) || [] : []
  const selectedDate = activeKey ? parseDate(activeKey) : null
  const monthHasComps = cells.some((d) => d && byDate.has(dateKey(d)))

  return (
    <section
      className="relative rounded-2xl p-5 md:p-7 border shadow-sm overflow-hidden"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-blue-500 to-amber-400 opacity-80" />

      {/* Header — badge + title + month nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isDark ? 'bg-amber-500/15 border-amber-400/25' : 'bg-amber-100 border-amber-200/60'
          }`}>
            <TrophyIcon className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('landing.competitionsTitle')}
          </h2>
        </div>

        <div className={`inline-flex items-center gap-1 self-start sm:self-auto rounded-xl border px-1.5 py-1 ${
          isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white/80'
        }`}>
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label={t('events.prevMonth')}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-amber-300 hover:bg-white/[0.06]'
                : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className={`min-w-[7.5rem] px-2 text-center text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={t('events.nextMonth')}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-amber-300 hover:bg-white/[0.06]'
                : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two columns on desktop: calendar left, details right. Stacked on mobile. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-5">
        {/* Calendar — roomy cells so dates read at a glance */}
        <div role="grid" aria-label={monthLabel}>
          <div role="row" className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEKDAY_KEYS.map((k) => (
              <div
                key={k}
                role="columnheader"
                className={`text-center text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {t(`events.weekdays.${k}`)}
              </div>
            ))}
          </div>
          <div role="row" className="grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (!d) return <div key={`blank-${i}`} role="gridcell" aria-hidden="true" className="aspect-square" />
              const key = dateKey(d)
              const has = byDate.has(key)
              const isToday = key === todayKey
              const isSelected = key === activeKey
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-label={formatDate(i18n, t, d)}
                  aria-pressed={isSelected}
                  disabled={!has}
                  onClick={() => setPicked((prev) => (prev?.key === key ? null : { key }))}
                  className={`relative aspect-square rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    has
                      ? `cursor-pointer ${isSelected
                          ? isDark
                            ? 'bg-amber-400/90 text-slate-900 shadow-md shadow-amber-500/20'
                            : 'bg-amber-400 text-slate-900 shadow-md shadow-amber-500/30'
                          : isDark
                            ? 'text-slate-200 hover:bg-white/[0.07]'
                            : 'text-slate-700 hover:bg-amber-50 hover:shadow-sm'
                        }`
                      : `${isDark ? 'text-slate-600' : 'text-slate-300'} cursor-default`
                  } ${isToday && !isSelected ? (isDark ? 'ring-1 ring-inset ring-blue-400/50' : 'ring-1 ring-inset ring-blue-400/60') : ''}`}
                >
                  <span className={isSelected ? '' : isToday ? 'text-blue-500 font-bold' : ''}>{d.getDate()}</span>
                  {/* Marker dot — competitions only */}
                  {has && (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-slate-900/70' : isDark ? 'bg-amber-400' : 'bg-amber-500'
                      }`}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Details panel — selected day's competitions. Capped to the
            calendar's height on desktop so the two columns stay balanced;
            extra cards scroll inside. */}
        <div
          className={`rounded-2xl border p-4 flex flex-col min-h-0 lg:max-h-[380px] ${
            isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white/50 border-white/80'
          }`}
        >
          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : isError ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('events.loadError')}</p>
              <button
                onClick={refetch}
                className={`mt-2 text-sm font-medium hover:underline ${isDark ? 'text-amber-300' : 'text-amber-600'}`}
              >
                {t('common.retry')}
              </button>
            </div>
          ) : !monthHasComps || selectedComps.length === 0 ? (
            <div className="flex-1 flex items-center">
              <EventEmptyState compact />
            </div>
          ) : (
            <>
              <h3 className={`text-sm font-semibold tracking-tight mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {selectedDate && formatDate(i18n, t, selectedDate)}
              </h3>
              <div className="space-y-2.5 overflow-y-auto flex-1 min-h-0 pr-0.5 max-h-[360px] lg:max-h-none">
                {selectedComps.map((ev) => (
                  <EventCard key={ev.id} event={ev} onSelect={() => setSelected(ev)} compact />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {selected && <EventModal event={selected} onClose={closeModal} />}
    </section>
  )
}

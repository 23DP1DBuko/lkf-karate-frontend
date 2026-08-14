import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
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

/**
 * Dashboard "Kalendārs" card — shows the current month's events (all of
 * them, not just a few) with simple ◀ ▶ month navigation. Reuses the same
 * EventCard / EventModal / empty-state components as the full Events page.
 */
export default function CalendarCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [view, setView] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selected, setSelected] = useState(null)
  const closeModal = useCallback(() => setSelected(null), [])
  const { data: events, isLoading, isError, refetch } = useCalendarEvents()

  const monthEvents = useMemo(
    () =>
      (events || []).filter((ev) => {
        const d = parseDate(ev.startDate)
        return d.getFullYear() === view.getFullYear() && d.getMonth() === view.getMonth()
      }),
    [events, view]
  )

  const monthLabel = `${view.getFullYear()} ${t(`events.months.${MONTH_KEYS[view.getMonth()]}`)}`
  const shift = (delta) =>
    setView((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))

  return (
    <section
      className="rounded-2xl p-6 border shadow-sm flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-md"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-sky-400" />

      {/* Header + month nav */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-500/15">
            <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            {t('dashboard.calendar')}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            aria-label={t('events.prevMonth')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-blue-500/10 transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300">
            {monthLabel}
          </span>
          <button
            onClick={() => shift(1)}
            aria-label={t('events.nextMonth')}
            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-blue-500/10 transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month events — all of them, scrollable so the card stays compact */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[420px] pr-0.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('events.loadError')}</p>
            <button
              onClick={refetch}
              className="mt-2 text-sm font-medium text-blue-600 hover:underline"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : monthEvents.length > 0 ? (
          monthEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} onSelect={() => setSelected(ev)} />
          ))
        ) : (
          <EventEmptyState compact />
        )}
      </div>

      {/* Footer link to the full calendar */}
      <button
        onClick={() => navigate('/events')}
        className="group mt-4 flex items-center justify-between w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all border border-blue-200/60 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:bg-white/[0.03] dark:border-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.06]"
      >
        <span>{t('events.openCalendar')}</span>
        <ArrowRightIcon className="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:translate-x-1 dark:text-slate-300" />
      </button>

      {selected && <EventModal event={selected} onClose={closeModal} />}
    </section>
  )
}

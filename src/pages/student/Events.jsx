import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { groupEventsByMonth } from '../../data/events'
import EventCard from '../../components/EventCard'
import EventModal from '../../components/EventModal'
import EventEmptyState from '../../components/EventEmptyState'
import { SkeletonList } from '../../components/Skeleton'
import ErrorState from '../../components/ErrorState'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useCalendarEvents } from '../../hooks/useCalendarEvents'

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

const FILTERS = [
  { value: 'all', labelKey: 'events.filterAll' },
  { value: 'competition', labelKey: 'events.filterCompetitions' },
  { value: 'seminar', labelKey: 'events.filterSeminars' },
  { value: 'exam', labelKey: 'events.filterExams' },
]

export default function Events() {
  const { t } = useTranslation()
  usePageTitle(t('events.title'))
  const { data: events, isLoading, isError, error, refetch } = useCalendarEvents()

  const [filter, setFilter] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  // null = "all months" overview; a Date = single-month view (empty months reachable)
  const [viewMonth, setViewMonth] = useState(null)
  const menuRef = useRef(null)
  const closeModal = useCallback(() => setSelected(null), [])

  // Close the filter dropdown on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const sections = useMemo(() => {
    const allSections = groupEventsByMonth(events || [])
    return allSections.map((section) => ({
      ...section,
      visibleEvents: section.events.filter((ev) => filter === 'all' || ev.type === filter),
    }))
  }, [events, filter])

  const isMonthView = viewMonth !== null
  const visibleSections = isMonthView
    ? sections.filter(
        (s) => s.year === viewMonth.getFullYear() && s.month === viewMonth.getMonth()
      )
    : sections

  const totalVisible = sections.reduce((n, s) => n + s.visibleEvents.length, 0)
  const activeFilter = FILTERS.find((f) => f.value === filter)

  const monthLabel = isMonthView
    ? `${viewMonth.getFullYear()} ${t(`events.months.${MONTH_KEYS[viewMonth.getMonth()]}`)}`
    : t('events.allMonths')

  if (isLoading) {
    return (
      <div className="min-h-screen w-full p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <SkeletonList count={4} />
        </div>
      </div>
    )
  }

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} title="Failed to load events" />
  }

  // Step months; from the "all months" overview, start at the current month
  const stepMonth = (delta) =>
    setViewMonth((prev) => {
      const base = prev || new Date()
      return new Date(base.getFullYear(), base.getMonth() + delta, 1)
    })

  const renderSection = (section) => (
    <section key={section.key} className="flex flex-col gap-3">
      <h2
        className="text-lg md:text-xl font-semibold tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {section.year} {t(`events.months.${MONTH_KEYS[section.month]}`)}
      </h2>
      {section.visibleEvents.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {section.visibleEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} onSelect={() => setSelected(ev)} />
          ))}
        </div>
      ) : (
        <EventEmptyState compact />
      )}
    </section>
  )

  return (
    <div className="min-h-screen w-full p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Title + controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('events.title')}</h1>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month stepper */}
            <div
              className="flex items-center gap-1 rounded-xl border px-1.5 py-1"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                aria-label={t('events.prevMonth')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(null)}
                title={isMonthView ? t('events.allMonths') : undefined}
                className="min-w-[7.5rem] px-2 py-0.5 text-center text-sm font-semibold rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/40"
                style={{ color: 'var(--text-primary)' }}
              >
                {monthLabel}
                {isMonthView && (
                  <XMarkIcon className="w-3.5 h-3.5 inline-block ml-1 -mb-0.5 text-slate-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => stepMonth(1)}
                aria-label={t('events.nextMonth')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Filter dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:shadow-sm"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
              >
                <span className="text-slate-500 dark:text-slate-400">{t('events.filterLabel')}</span>
                <span>{t(activeFilter.labelKey)}</span>
                <ChevronDownIcon
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <ul
                  role="listbox"
                  aria-label={t('events.filterLabel')}
                  className="absolute right-0 mt-2 w-52 rounded-xl border shadow-lg overflow-hidden z-20"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  {FILTERS.map((option) => {
                    const active = option.value === filter
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setFilter(option.value)
                            setMenuOpen(false)
                          }}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                          style={{ color: active ? '#2563eb' : 'var(--text-primary)' }}
                        >
                          {t(option.labelKey)}
                          {active && <CheckIcon className="w-4 h-4 text-blue-600" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Monthly sections */}
        {isMonthView ? (
          visibleSections.length > 0 ? (
            visibleSections.map(renderSection)
          ) : (
            <section className="flex flex-col gap-3">
              <h2
                className="text-lg md:text-xl font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {monthLabel}
              </h2>
              <EventEmptyState />
            </section>
          )
        ) : totalVisible === 0 ? (
          <EventEmptyState />
        ) : (
          sections.map(renderSection)
        )}
      </div>

      {/* Details modal */}
      {selected && <EventModal event={selected} onClose={closeModal} />}
    </div>
  )
}

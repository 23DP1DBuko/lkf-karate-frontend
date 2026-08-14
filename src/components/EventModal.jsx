import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrophyIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import useFocusTrap from '../hooks/useFocusTrap'
import { getLocalizedField } from '../api/strapi'
import { parseDate } from '../data/events'

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

const TYPE_META = {
  competition: {
    labelKey: 'events.typeCompetition',
    icon: TrophyIcon,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-500/15',
  },
  seminar: {
    labelKey: 'events.typeSeminar',
    icon: AcademicCapIcon,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-500/15',
  },
  exam: {
    labelKey: 'events.typeExam',
    icon: ClipboardDocumentListIcon,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-500/15',
  },
}

/** '10. marts, 2026' style date, localized via i18n month keys. */
function formatDate(i18n, t, d) {
  const month = t(`events.months.${MONTH_KEYS[d.getMonth()]}`)
  if (i18n.language === 'en') return `${month} ${d.getDate()}, ${d.getFullYear()}`
  return `${d.getDate()}. ${month} ${d.getFullYear()}`
}

export default function EventModal({ event, onClose }) {
  const { t, i18n } = useTranslation()
  const ref = useRef(null)
  useFocusTrap(ref)

  const meta = TYPE_META[event.type] || TYPE_META.seminar
  const Icon = meta.icon
  const title = getLocalizedField(event, i18n.language, 'title')
  const location = getLocalizedField(event, i18n.language, 'location')
  const description = getLocalizedField(event, i18n.language, 'description')

  const start = parseDate(event.startDate)
  const multiDay = !!event.endDate && event.endDate !== event.startDate
  const end = multiDay ? parseDate(event.endDate) : null
  const dateLabel = multiDay
    ? `${formatDate(i18n, t, start)} – ${formatDate(i18n, t, end)}`
    : formatDate(i18n, t, start)

  // Close on Escape (dialog pattern)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border relative"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700/50"
          aria-label={t('events.close')}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Header — type badge + title */}
        <header className="mb-4 pr-8">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {t(meta.labelKey)}
          </span>
          <h2 className="mt-2 text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
        </header>

        {/* Details grid (matches the exam modal layout) */}
        <dl className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {t('events.date')}
            </dt>
            <dd className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {dateLabel}
            </dd>
          </div>
          {event.time && !multiDay && (
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {t('events.time')}
              </dt>
              <dd className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {event.time}
              </dd>
            </div>
          )}
          {event.type === 'seminar' && event.isOnline ? (
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {t('events.location')}
              </dt>
              <dd className="mt-1 text-sm font-medium flex items-center gap-1.5 text-blue-600">
                <VideoCameraIcon className="w-4 h-4 flex-shrink-0" />
                {t('events.online')}
              </dd>
            </div>
          ) : location ? (
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {t('events.location')}
              </dt>
              <dd className="mt-1 text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <MapPinIcon className="w-4 h-4 flex-shrink-0 text-slate-400" />
                {location}
              </dd>
            </div>
          ) : null}
          {event.type === 'exam' && (
            <>
              <div>
                <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {t('events.questions')}
                </dt>
                <dd className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {event.questionCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {t('events.passingScore')}
                </dt>
                <dd className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {event.passingScore}%
                </dd>
              </div>
            </>
          )}
        </dl>

        {description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}

        {event.meetingUrl && (
          <a
            href={event.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            <VideoCameraIcon className="w-4 h-4" />
            {t('events.joinMeeting')}
          </a>
        )}

        {event.topics?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('events.topics')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {event.topics.map(key => (
                <span
                  key={key}
                  className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20"
                >
                  {t(`topics.${key}`)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium rounded-xl border transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

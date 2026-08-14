import { useTranslation } from 'react-i18next'
import {
  TrophyIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  VideoCameraIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { getLocalizedField } from '../api/strapi'
import { parseDate } from '../data/events'

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

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

/**
 * Event list card — single-day and multi-day layouts share the same shell.
 * - Left: rounded date tile (day + localized weekday, or start/end range).
 * - Middle: uppercase type label (+ optional time) and localized title.
 * - Right: type icon + chevron with a localized "View details" tooltip.
 */
export default function EventCard({ event, onSelect, compact = false }) {
  const { t, i18n } = useTranslation()
  const meta = TYPE_META[event.type] || TYPE_META.seminar
  const Icon = meta.icon
  const start = parseDate(event.startDate)
  const multiDay = !!event.endDate && event.endDate !== event.startDate
  const end = multiDay ? parseDate(event.endDate) : null
  const title = getLocalizedField(event, i18n.language, 'title')
  const weekday = (d) => t(`events.weekdays.${WEEKDAY_KEYS[d.getDay()]}`)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${t(meta.labelKey)} — ${title}`}
      className={`group w-full text-left rounded-2xl border shadow-sm flex items-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        compact ? 'px-3 py-4 gap-2.5' : 'p-4 gap-3 md:gap-4'
      }`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Date tile — only the width shrinks in compact; height stays the same */}
      <div
        className={`flex-shrink-0 rounded-xl text-center border flex flex-col items-center justify-center ${
          compact ? 'w-10' : 'w-14'
        } ${
          multiDay ? 'py-1.5' : 'py-2.5'
        } bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20`}
      >
        {multiDay ? (
          <>
            <p className="font-bold leading-tight text-blue-700 dark:text-blue-400 text-sm">
              {start.getDate()}
              <span className="ml-1 font-semibold text-slate-500 dark:text-slate-400 text-[10px]">
                {weekday(start)}
              </span>
            </p>
            <span className="leading-none text-slate-400 dark:text-slate-500 text-[10px] my-1">–</span>
            <p className="font-bold leading-tight text-blue-700 dark:text-blue-400 text-sm">
              {end.getDate()}
              <span className="ml-1 font-semibold text-slate-500 dark:text-slate-400 text-[10px]">
                {weekday(end)}
              </span>
            </p>
          </>
        ) : (
          <>
            <p className="font-bold leading-none text-blue-700 dark:text-blue-400 text-lg">{start.getDate()}</p>
            <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1 text-[10px]">
              {weekday(start)}
            </p>
          </>
        )}
      </div>

      {/* Type + title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`font-semibold uppercase tracking-wider ${meta.color} text-[11px]`}>
            {t(meta.labelKey)}
          </span>
          {event.time && !multiDay && (
            <span className="ml-auto font-medium text-slate-400 dark:text-slate-500 text-xs">{event.time}</span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 min-w-0">
          <span className="text-slate-600 dark:text-slate-300 truncate text-sm" title={title}>
            {title}
          </span>
          {event.isOnline && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 flex-shrink-0">
              <VideoCameraIcon className="w-3 h-3" />
              {t('events.online')}
            </span>
          )}
        </p>
      </div>

      {/* Type icon + chevron (tooltip on hover) */}
      <div className="relative flex flex-shrink-0 items-center gap-1.5 group/action" aria-hidden="true">
        {!compact && (
          <span
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${meta.bg} group-hover/action:bg-blue-100 dark:group-hover/action:bg-blue-500/20`}
          >
            <Icon
              className={`w-4 h-4 transition-colors duration-200 ${meta.color} group-hover/action:text-blue-600 dark:group-hover/action:text-blue-400`}
            />
          </span>
        )}
        <span className="text-slate-400 transition-colors duration-200 group-hover/action:text-blue-600 dark:group-hover/action:text-blue-400">
          <ChevronRightIcon className="w-4 h-4" />
        </span>
        {!compact && (
          /* Tooltip */
          <span className="pointer-events-none absolute right-0 bottom-full mb-2 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/action:opacity-100">
            {t('events.viewDetails')}
          </span>
        )}
      </div>
    </button>
  )
}

import { useTranslation } from 'react-i18next'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'

/**
 * Informational empty state for a month with no planned events.
 * Same colors/typography as the rest of the product — it communicates
 * "nothing scheduled", not an error or loading state.
 */
export default function EventEmptyState({ compact = false }) {
  const { t } = useTranslation()
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-dashed ${
        compact ? 'px-4 py-7' : 'px-6 py-14'
      }`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700/40 mb-3">
        <CalendarDaysIcon className="w-6 h-6 text-slate-400" />
      </div>
      <p className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`} style={{ color: 'var(--text-primary)' }}>
        {t('events.emptyTitle')}
      </p>
      <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
        {t('events.emptySubtitle')}
      </p>
    </div>
  )
}

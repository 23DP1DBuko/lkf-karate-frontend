/**
 * Empty state for admin list pages (seminars, competitions, ...).
 * Dashed border card with an icon, a title, a one-line description and an
 * optional call-to-action button — consistent with EventEmptyState but
 * action-oriented so admins can jump straight into creating the first row.
 */
export default function AdminEmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed px-6 py-14"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700/40 mb-3">
        {Icon && <Icon className="w-7 h-7 text-slate-400" aria-hidden="true" />}
      </div>
      <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      {description && (
        <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

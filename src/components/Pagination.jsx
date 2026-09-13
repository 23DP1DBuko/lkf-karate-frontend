import { useTranslation } from 'react-i18next'

/**
 * Shared pager for the admin manage lists.
 *
 * Extracted from AdminChapters so every "Manage X" page paginates identically:
 * a "Showing 1–25 of 273" summary plus Previous / numbered pages / Next. Renders
 * nothing when there is a single page, exactly like the Chapters list did.
 *
 * Works with both data sources:
 *   • server-side paging — pass the values from Strapi's `meta.pagination`
 *   • client-side paging — pass the size/total of the in-memory slice
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  pageSize = 25,
  onPageChange,
  className = '',
}) {
  const { t } = useTranslation()

  if (!Number.isFinite(totalPages) || totalPages <= 1) return null

  const safePage = Math.min(Math.max(1, page), totalPages)
  const from = (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  // Show at most 7 page numbers, keeping the current page near the middle.
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (safePage <= 4) return i + 1
    if (safePage >= totalPages - 3) return totalPages - 6 + i
    return safePage - 3 + i
  })

  const navButton = 'px-3 py-1.5 rounded-lg text-sm font-medium border disabled:opacity-30 hover:bg-gray-50 transition'

  return (
    <nav
      aria-label={t('common.paginationLabel')}
      className={`flex flex-wrap items-center justify-between gap-3 mt-4 px-1 ${className}`}
    >
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('common.paginationShowing', { from, to, total })}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className={navButton}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {t('common.paginationPrevious')}
        </button>

        {pages.map(pageNum => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            aria-label={t('common.paginationPage', { page: pageNum })}
            aria-current={safePage === pageNum ? 'page' : undefined}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
              safePage === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
            }`}
            style={{
              color: safePage === pageNum ? 'white' : 'var(--text-secondary)',
              backgroundColor: safePage === pageNum ? '#2563eb' : 'transparent',
            }}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className={navButton}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {t('common.paginationNext')}
        </button>
      </div>
    </nav>
  )
}

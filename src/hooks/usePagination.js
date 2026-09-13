import { useState } from 'react'

/** Same page size as the Chapters manage page. */
export const ADMIN_PAGE_SIZE = 25

/**
 * Client-side pager state for admin lists that already hold the full result set
 * (and therefore must keep filtering/sorting/reordering in memory).
 *
 * - `resetKey` returns to page 1 whenever filters/search/sort change.
 * - the page is clamped when the filtered list shrinks (e.g. after a delete).
 *
 * Both are handled during render instead of in an effect: React's documented
 * "adjust state when a prop changes" pattern for `resetKey`, and derive-don't-sync
 * for the clamp. That keeps the pager free of the cascading renders an effect
 * would cause.
 *
 * Pair it with the shared <Pagination /> component so the markup stays identical
 * to the server-paginated pages.
 */
export default function usePagination({ total = 0, pageSize = ADMIN_PAGE_SIZE, resetKey = '' } = {}) {
  const [page, setPage] = useState(1)
  const [lastResetKey, setLastResetKey] = useState(resetKey)

  // Filters changed → back to the first page (before anything is committed).
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))
  // Clamp while deriving: when the list shrinks, the visible page follows without
  // writing state from an effect.
  const safePage = Math.min(Math.max(1, page), totalPages)

  const rangeStart = (safePage - 1) * pageSize

  const goToPage = (next) => setPage(Math.max(1, Math.min(next, totalPages)))

  return {
    page: safePage,
    totalPages,
    pageSize,
    goToPage,
    rangeStart,
    rangeEnd: rangeStart + pageSize,
    slice: (items) => (items || []).slice(rangeStart, rangeStart + pageSize),
  }
}

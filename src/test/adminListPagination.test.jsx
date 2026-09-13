import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, renderHook, act, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import Pagination from '../components/Pagination'
import usePagination, { ADMIN_PAGE_SIZE } from '../hooks/usePagination'
import useScrollToForm from '../hooks/useScrollToForm'
import { buildQuestionListParams } from '../utils/adminListParams'

// The pager only needs labels; interpolate so assertions can read the numbers.
vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
      i18n: { language: 'en' },
    }),
  }
})

describe('Pagination', () => {
  it('renders nothing when everything fits on a single page', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={12} pageSize={25} onPageChange={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows the visible range and reports the clicked page', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={11} total={273} pageSize={25} onPageChange={onPageChange} />)

    expect(screen.getByText(/"from":1,"to":25,"total":273/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'common.paginationNext' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole('button', { name: 'common.paginationPage {"page":3}' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={3} total={60} pageSize={25} onPageChange={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'common.paginationPrevious' })).toBeDisabled()

    rerender(<Pagination page={3} totalPages={3} total={60} pageSize={25} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'common.paginationNext' })).toBeDisabled()
    // Clamped range: last page only holds items 51-60.
    expect(screen.getByText(/"from":51,"to":60,"total":60/)).toBeInTheDocument()
  })
})

describe('usePagination', () => {
  const items = Array.from({ length: 60 }, (_, i) => i + 1)

  it('slices by page and clamps navigation to the available pages', () => {
    const { result } = renderHook(() => usePagination({ total: items.length }))

    expect(ADMIN_PAGE_SIZE).toBe(25)
    expect(result.current.totalPages).toBe(3)
    expect(result.current.slice(items)).toHaveLength(25)
    expect(result.current.slice(items)[0]).toBe(1)

    act(() => result.current.goToPage(3))
    expect(result.current.slice(items)).toEqual(
      Array.from({ length: 10 }, (_, i) => 51 + i)
    )

    act(() => result.current.goToPage(99))
    expect(result.current.page).toBe(3)
    act(() => result.current.goToPage(-5))
    expect(result.current.page).toBe(1)
  })

  it('returns to page 1 when filters change and clamps when the list shrinks', () => {
    const { result, rerender } = renderHook(
      ({ total, resetKey }) => usePagination({ total, resetKey }),
      { initialProps: { total: 60, resetKey: 'all' } }
    )

    act(() => result.current.goToPage(3))
    expect(result.current.page).toBe(3)

    rerender({ total: 60, resetKey: 'kata' })
    expect(result.current.page).toBe(1)

    act(() => result.current.goToPage(3))
    rerender({ total: 5, resetKey: 'kata' })
    expect(result.current.page).toBe(1)
  })
})

describe('useScrollToForm', () => {
  let scrollIntoView

  beforeEach(() => {
    scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    delete Element.prototype.scrollIntoView
  })

  function EditForm() {
    const [editing, setEditing] = useState(null)
    const formRef = useScrollToForm(editing?.documentId)
    return (
      <div>
        <button type="button" onClick={() => setEditing({ documentId: 'q1' })}>edit</button>
        <div ref={formRef}>
          <input type="hidden" name="documentId" value={editing?.documentId || ''} />
          <input aria-label="title" />
        </div>
      </div>
    )
  }

  it('does not scroll until an item is selected', () => {
    render(<EditForm />)
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(screen.getByLabelText('title')).not.toHaveFocus()
  })

  it('scrolls to the form and focuses the first real field when editing starts', () => {
    render(<EditForm />)
    fireEvent.click(screen.getByRole('button', { name: 'edit' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(screen.getByLabelText('title')).toHaveFocus()
  })
})

describe('buildQuestionListParams', () => {
  it('carries pagination, filters and search on every page request', () => {
    const page1 = buildQuestionListParams({ page: 1 })
    expect(page1['pagination[page]']).toBe(1)
    expect(page1['pagination[pageSize]']).toBe(ADMIN_PAGE_SIZE)
    expect(page1['filters[course][documentId][$eq]']).toBeUndefined()

    const page3 = buildQuestionListParams({ page: 3, course: 'c1', type: 'open_text', search: 'kata' })
    expect(page3['pagination[page]']).toBe(3)
    expect(page3['pagination[pageSize]']).toBe(ADMIN_PAGE_SIZE)
    expect(page3['filters[course][documentId][$eq]']).toBe('c1')
    expect(page3['filters[type][$eq]']).toBe('open_text')
    // Search mirrors the fields the list used to scan client-side.
    const searchKeys = Object.keys(page3).filter(k => k.includes('$containsi'))
    expect(searchKeys).toHaveLength(7)
    expect(Object.values(page3).filter(v => v === 'kata')).toHaveLength(7)
  })
})

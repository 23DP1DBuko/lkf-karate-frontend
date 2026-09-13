import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminSeminars from '../pages/admin/AdminSeminars'
import AdminCompetitions from '../pages/admin/AdminCompetitions'

const { apiMock, fetchAllMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  fetchAllMock: vi.fn(),
}))

vi.mock('../api/strapi', () => ({
  default: apiMock,
  fetchAllWithStatus: fetchAllMock,
}))

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key) => key,
      i18n: { language: 'en', changeLanguage: () => Promise.resolve() },
    }),
  }
})

const renderPage = (ui) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

// Unique, increasing dates so the default date_asc sort keeps 01..N in order.
const isoDay = (i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)

const makeSeminars = (count) =>
  Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return {
      id: i + 1,
      documentId: `sem${n}`,
      title: `Seminar ${n}`,
      date: isoDay(i),
      time_from: '10:00:00',
      time_to: '12:00:00',
      type: 'Practical Kata',
      isOnline: false,
      place: { country: 'LV', city: 'Riga', address: 'Dojo 1' },
      publishedAt: '2026-01-01T00:00:00.000Z',
    }
  })

const makeCompetitions = (count) =>
  Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return {
      id: i + 1,
      documentId: `comp${n}`,
      title: `Competition ${n}`,
      date_from: isoDay(i),
      date_to: isoDay(i + 1),
      rating: 'International',
      place: { country: 'LV', city: 'Riga', address: 'Arena 1' },
      publishedAt: '2026-01-01T00:00:00.000Z',
    }
  })

describe('AdminSeminars pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pages the list 25 at a time and returns to page 1 when the search changes', async () => {
    fetchAllMock.mockResolvedValue(makeSeminars(30))
    const user = userEvent.setup()
    const { container } = renderPage(<AdminSeminars />)

    await waitFor(() => expect(screen.getAllByText('Seminar 01').length).toBeGreaterThan(0))
    // Page 1: first 25 rows only — in both the mobile cards and the table.
    expect(container.querySelectorAll('tbody tr')).toHaveLength(25)
    expect(screen.getAllByText('Seminar 25').length).toBe(2)
    expect(screen.queryByText('Seminar 26')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'common.paginationNext' }))
    await waitFor(() => expect(screen.getAllByText('Seminar 26').length).toBe(2))
    expect(screen.queryByText('Seminar 01')).not.toBeInTheDocument()

    // Searching resets to page 1 and pages the filtered set.
    await user.type(container.querySelector('input[type="search"]'), 'Seminar')
    await waitFor(() => expect(screen.getAllByText('Seminar 01').length).toBe(2))
  })
})

describe('AdminCompetitions pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('limits the visible rows to the page size and exposes a pager', async () => {
    fetchAllMock.mockResolvedValue(makeCompetitions(30))
    const user = userEvent.setup()
    const { container } = renderPage(<AdminCompetitions />)

    await waitFor(() => expect(screen.getAllByText('Competition 01').length).toBeGreaterThan(0))
    expect(container.querySelectorAll('tbody tr')).toHaveLength(25)
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('button', { name: 'common.paginationNext' })).toBeEnabled()
    expect(screen.queryByText('Competition 30')).not.toBeInTheDocument()

    await user.click(within(nav).getByRole('button', { name: 'common.paginationNext' }))
    await waitFor(() => expect(screen.getAllByText('Competition 30').length).toBeGreaterThan(0))
    expect(screen.queryByText('Competition 01')).not.toBeInTheDocument()
  })
})

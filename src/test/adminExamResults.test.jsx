import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminExamResults from '../pages/admin/AdminExamResults'

const { apiMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), put: vi.fn() },
}))

vi.mock('../api/strapi', () => ({
  default: apiMock,
  getLocalizedField: (item, language, fieldBase) => {
    if (!item) return ''
    const suffix = { lv: 'Lv', ru: 'Ru', en: 'En' }[language] || 'Lv'
    const k = `${fieldBase}${suffix}`
    return item[k] || item[`${fieldBase}Lv`] || item[`${fieldBase}En`] || item[fieldBase] || ''
  },
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

const fields6 = (expectedText) =>
  Array.from({ length: 6 }, (_, i) => ({ expected: expectedText(i) }))

const attempt = {
  id: 100,
  documentId: 'att1',
  kind: 'exam',
  submittedAt: '2026-09-01T10:00:00.000Z',
  startedAt: '2026-09-01T09:30:00.000Z',
  score: 40,
  passed: false,
  timeSpentSeconds: 900,
  answers: { 50: ['crit A', '', 'crit C', '', '', ''] },
  manualGrades: {},
  questions: [
    {
      id: 50,
      documentId: 'q50',
      type: 'open_text',
      textLv: 'List 6 criteria',
      textEn: 'List 6 criteria',
      answerFieldsLv: fields6((i) => `Expected ${i + 1}`),
      answerFieldsEn: fields6((i) => `Expected ${i + 1}`),
    },
  ],
  exam: { documentId: 'exam1', title: 'Kumite Exam', showResults: true },
  user: { id: 7, username: 's1', firstName: 'Test', lastName: 'Student' },
  course: null,
}

function mockApi() {
  apiMock.get.mockImplementation((url) => {
    if (url === '/exam-attempts/all') return Promise.resolve({ data: { data: [attempt] } })
    if (url === '/questions') return Promise.resolve({ data: { data: [] } })
    return Promise.resolve({ data: {} })
  })
  apiMock.put.mockResolvedValue({ data: { data: { score: 17, passed: false } } })
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AdminExamResults />
    </QueryClientProvider>
  )
}

async function openReview() {
  renderPage()
  const review = await screen.findByRole('button', { name: 'admin.results.iconReview' })
  await userEvent.click(review)
  // One Correct + one Incorrect control per answer field (6 fields).
  await screen.findAllByRole('button', { name: '✓ admin.results.correctLabel' })
}

describe('AdminExamResults — per-answer-field grading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })

  it('shows the student answer and the example from the bank for every field', async () => {
    await openReview()
    expect(screen.getAllByText('admin.results.exampleFromBank')).toHaveLength(6)
    expect(screen.getAllByText('admin.results.studentAnswerLabel')).toHaveLength(6)
    expect(screen.getAllByText('admin.results.answerOfTotal')).toHaveLength(6)
  })

  it('renders a Correct / Incorrect choice for every answer field', async () => {
    await openReview()
    expect(screen.getAllByRole('button', { name: '✓ admin.results.correctLabel' })).toHaveLength(6)
    expect(screen.getAllByRole('button', { name: '✗ admin.results.incorrectLabel' })).toHaveLength(6)
  })

  it('saves a Correct decision (1 point) for the first answer field', async () => {
    await openReview()
    const correctButtons = screen.getAllByRole('button', { name: '✓ admin.results.correctLabel' })
    await userEvent.click(correctButtons[0])
    await userEvent.click(screen.getByRole('button', { name: 'admin.results.saveReview' }))

    await waitFor(() => {
      expect(apiMock.put).toHaveBeenCalledWith('/exam-attempts/grade/100', {
        manualGrades: { 50: { 0: 1 } },
      })
    })
  })

  it('saves an Incorrect decision (0 points) for a later answer field', async () => {
    await openReview()
    const incorrectButtons = screen.getAllByRole('button', { name: '✗ admin.results.incorrectLabel' })
    await userEvent.click(incorrectButtons[2])
    await userEvent.click(screen.getByRole('button', { name: 'admin.results.saveReview' }))

    await waitFor(() => {
      expect(apiMock.put).toHaveBeenCalledWith('/exam-attempts/grade/100', {
        manualGrades: { 50: { 2: 0 } },
      })
    })
  })

  it('no longer offers any answer-bank decision controls', async () => {
    await openReview()
    expect(screen.queryByText('admin.results.changeBankDecision')).not.toBeInTheDocument()
    expect(screen.queryByText('admin.results.bankAnswerLabel')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

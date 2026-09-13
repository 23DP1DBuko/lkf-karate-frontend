import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminImportQuiz from '../pages/admin/AdminImportQuiz'

const { apiMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

vi.mock('../api/strapi', () => ({
  default: apiMock,
  getLocalizedField: (item, language, fieldBase) =>
    item?.[`${fieldBase}Lv`] || item?.[fieldBase] || '',
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

const questions = [
  { id: 1, documentId: 'q1', order: 1, type: 'yes_no', textLv: 'Q one', correctAnswer: null },
  { id: 2, documentId: 'q2', order: 2, type: 'yes_no', textLv: 'Q two', correctAnswer: null },
]

function mockApi(list) {
  apiMock.get.mockImplementation((url) => {
    if (url === '/questions') {
      return Promise.resolve({
        data: { data: list, meta: { pagination: { pageCount: 1 } } },
      })
    }
    return Promise.resolve({ data: { data: [] } })
  })
  apiMock.put.mockResolvedValue({ data: { data: {} } })
}

function renderQuiz(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AdminImportQuiz />
    </MemoryRouter>,
  )
}

describe('AdminImportQuiz — persistent review', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads every question of the review exam', async () => {
    mockApi(questions)
    renderQuiz('/admin/import-quiz?examId=rev1')

    expect(await screen.findByText('Q one')).toBeInTheDocument()
    expect(screen.getByText('Q two')).toBeInTheDocument()
    // Starts as a fresh review.
    expect(screen.getByText('admin.importQuiz.startReview')).toBeInTheDocument()
  })

  it('saves an answer to the question immediately (survives refresh)', async () => {
    mockApi(questions)
    renderQuiz('/admin/import-quiz?examId=rev1')

    const yesButtons = await screen.findAllByRole('button', { name: 'exam.yes' })
    await userEvent.click(yesButtons[0])

    await waitFor(() => {
      expect(apiMock.put).toHaveBeenCalledWith('/questions/q1', {
        data: { correctAnswer: 'true', answerStatus: 'fromQuiz' },
      })
    })
  })

  it('restores already-saved answers and shows reviewed vs not reviewed', async () => {
    mockApi([{ ...questions[0], correctAnswer: 'true' }, questions[1]])
    renderQuiz('/admin/import-quiz?examId=rev1')

    await screen.findByText('Q one')
    expect(screen.getAllByText('admin.importQuiz.reviewed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('admin.importQuiz.notReviewed').length).toBeGreaterThan(0)
    // Read-only state: submitting is not needed, the answer is already saved.
    expect(apiMock.put).not.toHaveBeenCalled()
  })

  it('shows the completion state once every question is answered', async () => {
    mockApi(questions)
    renderQuiz('/admin/import-quiz?examId=rev1')
    await screen.findByText('Q one')

    // Re-query after each click so React re-renders never leave a stale node.
    await userEvent.click((await screen.findAllByRole('button', { name: 'exam.yes' }))[0])
    await userEvent.click((await screen.findAllByRole('button', { name: 'exam.yes' }))[1])

    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(2))
    expect(apiMock.put.mock.calls.map((c) => c[0])).toEqual(['/questions/q1', '/questions/q2'])
    expect(await screen.findByText('admin.importQuiz.reviewCompleted')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExamPage from '../pages/student/ExamPage'

const { apiMock } = vi.hoisted(() => ({
  apiMock: { post: vi.fn(), get: vi.fn() },
}))

vi.mock('../api/strapi', () => ({
  default: apiMock,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ documentId: 'exam1' }),
    useNavigate: () => vi.fn(),
  }
})

vi.mock('../context/useExamAttempt', () => ({
  useExamAttempt: () => ({
    setActiveAttempt: vi.fn(),
    clearActiveAttempt: vi.fn(),
  }),
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

// Open-text question with 2 configured fields; start returns previously saved
// answers (the resume scenario).
const startData = {
  data: {
    attemptId: 1,
    duration: 30,
    remainingSeconds: 120,
    showResults: false,
    examTitle: 'Kumite Exam',
    questions: [
      {
        id: 50,
        documentId: 'q50',
        type: 'open_text',
        text: 'List 6 criteria',
        answerFieldCount: 2,
        media: [],
      },
    ],
    answers: { 50: ['saved one', 'saved two'] },
  },
}

function mockApi() {
  apiMock.post.mockImplementation((url) => {
    if (url === '/exams/start') return Promise.resolve(startData)
    return Promise.resolve({ data: { ok: true } })
  })
}

async function renderExam() {
  render(<ExamPage />)
  // Wait for /exams/start to resolve and the open-text inputs to hydrate.
  return screen.findAllByRole('textbox')
}

describe('ExamPage — open-text autosave and resume', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resumes an attempt by reloading previously saved answers into the correct fields', async () => {
    const fields = await renderExam()
    expect(fields).toHaveLength(2)
    expect(fields[0]).toHaveValue('saved one')
    expect(fields[1]).toHaveValue('saved two')
  })

  it('autosaves typed answers via save-progress after the debounce window', async () => {
    // Hydrate with real timers first (findBy* waits must not run under fake
    // timers), then enable fake timers. fireEvent is synchronous, so it does
    // not deadlock the way user-event's internal waits do under fake timers.
    const fields = await renderExam()
    vi.useFakeTimers()

    fireEvent.change(fields[0], { target: { value: 'saved oneNEW' } })

    // Debounced autosave fires ~2s after the last change.
    await vi.advanceTimersByTimeAsync(2500)

    expect(apiMock.post).toHaveBeenCalledWith(
      '/exams/save-progress',
      expect.objectContaining({
        attemptId: 1,
        answers: expect.objectContaining({
          50: expect.arrayContaining([expect.stringContaining('NEW')]),
        }),
      })
    )
  })
})
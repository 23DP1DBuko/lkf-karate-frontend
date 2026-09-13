import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

vi.mock('../api/strapi', () => ({ default: apiMock }))

import {
  fetchAllQuestions,
  reviewProgress,
  reviewQuizPath,
  buildReviewExamTitle,
  upsertReviewExam,
  REVIEW_TYPE,
} from '../utils/reviewImport'

const page = (items, pageCount) => ({
  data: { data: items, meta: { pagination: { pageCount } } },
})

describe('fetchAllQuestions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loops every page so sets larger than 100 are fully loaded', async () => {
    apiMock.get
      .mockResolvedValueOnce(page([{ id: 1 }, { id: 2 }], 3))
      .mockResolvedValueOnce(page([{ id: 3 }], 3))
      .mockResolvedValueOnce(page([{ id: 4 }], 3))

    const all = await fetchAllQuestions({ 'filters[x]': 'y' })

    expect(all.map((q) => q.id)).toEqual([1, 2, 3, 4])
    expect(apiMock.get).toHaveBeenCalledTimes(3)
    // pageSize stays within Strapi's 100-row cap; pages advance.
    expect(apiMock.get.mock.calls[0][1].params['pagination[pageSize]']).toBe(100)
    expect(apiMock.get.mock.calls[0][1].params['pagination[page]']).toBe(1)
    expect(apiMock.get.mock.calls[2][1].params['pagination[page]']).toBe(3)
  })

  it('stops after one request when there is no pagination meta', async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 9 }] } })
    const all = await fetchAllQuestions()
    expect(all).toHaveLength(1)
    expect(apiMock.get).toHaveBeenCalledTimes(1)
  })
})

describe('pure review helpers', () => {
  it('reviewProgress counts only questions with a saved answer', () => {
    const questions = [{ correctAnswer: 'true' }, { correctAnswer: null }, {}]
    expect(reviewProgress(questions)).toEqual({
      total: 3,
      reviewed: 1,
      remaining: 2,
      complete: false,
    })
    expect(reviewProgress([{ correctAnswer: 'false' }]).complete).toBe(true)
    expect(reviewProgress([]).complete).toBe(false)
  })

  it('reviewQuizPath prefers the exam id and keeps the course context', () => {
    expect(
      reviewQuizPath({ examId: 'e1', courseId: 'c1', questionSetKey: 'kumite-2024' }),
    ).toBe('/admin/import-quiz?examId=e1&courseId=c1&questionSetKey=kumite-2024')
  })

  it('buildReviewExamTitle names the course and question set', () => {
    const title = buildReviewExamTitle({ courseTitle: 'Kumite', questionSetKey: 'kumite-2024' })
    expect(title).toContain('Kumite')
    expect(title).toContain('kumite-2024')
  })
})

describe('upsertReviewExam', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a review exam flagged import_review when none exists', async () => {
    apiMock.get.mockResolvedValueOnce(page([], 1)) // fetchReviewExam → none
    apiMock.post.mockResolvedValueOnce({ data: { data: { documentId: 'rev1' } } })

    const exam = await upsertReviewExam({
      courseId: 'c1',
      courseTitle: 'Kumite',
      questionSetKey: 'kumite-2024',
      questionDocumentIds: ['q1', 'q2'],
    })

    expect(exam).toEqual({ documentId: 'rev1' })
    expect(apiMock.post).toHaveBeenCalledTimes(1)
    const { data } = apiMock.post.mock.calls[0][1]
    expect(data.reviewType).toBe(REVIEW_TYPE)
    expect(data.questions).toEqual({ set: ['q1', 'q2'] })
    expect(data.course).toEqual({ connect: ['c1'] })
  })

  it('reuses the newest review exam and appends new questions', async () => {
    apiMock.get.mockResolvedValueOnce(
      page([{ documentId: 'rev1', questions: [{ documentId: 'q1' }] }], 1),
    )
    apiMock.put.mockResolvedValueOnce({ data: { data: { documentId: 'rev1' } } })

    await upsertReviewExam({ courseId: 'c1', questionDocumentIds: ['q2', 'q1'] })

    expect(apiMock.post).not.toHaveBeenCalled()
    expect(apiMock.put).toHaveBeenCalledWith('/exams/rev1', {
      data: { questions: { set: ['q1', 'q2'] }, questionCount: 2 },
    })
  })

  it('returns null when there is nothing to review and no existing exam', async () => {
    apiMock.get.mockResolvedValueOnce(page([], 1))
    expect(await upsertReviewExam({ courseId: 'c1', questionDocumentIds: [] })).toBe(null)
    expect(apiMock.post).not.toHaveBeenCalled()
  })
})

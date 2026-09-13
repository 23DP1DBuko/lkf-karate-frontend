// reviewImport.js
// ---------------------------------------------------------------------------
// Persistent post-import review helpers.
//
// After a question import, every question that still has no correct answer is
// grouped into a real Exam with `reviewType = 'import_review'`. That exam is
// the persistent review workspace:
//   - it survives navigation and page refreshes (it lives in the database),
//   - it is discoverable from Admin → Exams,
//   - it is hidden from students (exam-session.start rejects it and the
//     student exam queries filter reviewType = null).
//
// Every question fetch here paginates explicitly because Strapi caps
// `pagination[pageSize]` at 100 — a set with hundreds of questions must be
// loaded across pages, never truncated at the first 100.
// ---------------------------------------------------------------------------

export const REVIEW_TYPE = 'import_review'
export const REVIEW_PAGE_SIZE = 100

// Separated so tests can stub the HTTP client.
async function apiClient() {
  const { default: api } = await import('../api/strapi')
  return api
}

/**
 * Fetch EVERY question matching `params`, looping over pages until pageCount.
 * `params` is a plain Strapi query object, e.g.
 *   { 'filters[course][documentId][$eq]': courseId }
 */
export async function fetchAllQuestions(params = {}, { sort = 'order:asc' } = {}) {
  const api = await apiClient()
  let page = 1
  let all = []

  while (true) {
    const res = await api.get('/questions', {
      params: {
        ...params,
        'pagination[page]': page,
        'pagination[pageSize]': REVIEW_PAGE_SIZE,
        sort,
      },
    })
    const items = res?.data?.data || []
    all = [...all, ...items]

    const pagination = res?.data?.meta?.pagination
    if (!pagination || page >= pagination.pageCount) break
    page++
  }

  return all
}

/** Questions that still need an answer (course-wide or scoped to one set). */
export async function fetchQuestionsToReview({ courseId, questionSetKey } = {}) {
  if (!courseId) return []
  const params = {
    'filters[course][documentId][$eq]': courseId,
    'filters[answerStatus][$eq]': 'missing',
  }
  if (questionSetKey) params['filters[questionSetKey][$eq]'] = questionSetKey
  return fetchAllQuestions(params)
}

/** Every question linked to a review exam (paginated). */
export async function fetchExamQuestions(examDocumentId) {
  if (!examDocumentId) return []
  return fetchAllQuestions({ 'filters[exams][documentId][$eq]': examDocumentId })
}

/** The newest import-review exam for a course, or null. */
export async function fetchReviewExam(courseId) {
  if (!courseId) return null
  const api = await apiClient()
  const res = await api.get('/exams', {
    params: {
      'filters[course][documentId][$eq]': courseId,
      'filters[reviewType][$eq]': REVIEW_TYPE,
      'populate[questions]': 'true',
      'sort': 'createdAt:desc',
      'pagination[pageSize]': 1,
    },
  })
  return (res?.data?.data || [])[0] || null
}

export function buildReviewExamTitle({ courseTitle, questionSetKey } = {}) {
  const base = courseTitle || 'Course'
  const set = questionSetKey ? ` (${questionSetKey})` : ''
  return `Review: imported questions without answers — ${base}${set}`
}

/** { total, reviewed, remaining, complete } from a question list. */
export function reviewProgress(questions) {
  const list = Array.isArray(questions) ? questions : []
  const total = list.length
  const reviewed = list.filter((q) => q?.correctAnswer != null).length
  return { total, reviewed, remaining: total - reviewed, complete: total > 0 && reviewed === total }
}

/** Deep link used by the import page and Admin → Exams. */
export function reviewQuizPath({ examId, courseId, questionSetKey } = {}) {
  const q = new URLSearchParams()
  if (examId) q.set('examId', examId)
  if (courseId) q.set('courseId', courseId)
  if (questionSetKey) q.set('questionSetKey', questionSetKey)
  return `/admin/import-quiz?${q.toString()}`
}

/**
 * Persist the review workspace for a set of questions.
 *
 * Reuses the newest existing review exam of the course (appending any new
 * questions) so repeated/translation-only imports never pile up exams, and
 * creates one when none exists yet. Returns the exam (or null on failure).
 */
export async function upsertReviewExam({
  courseId,
  courseTitle,
  questionSetKey,
  questionDocumentIds,
} = {}) {
  if (!courseId) return null
  const api = await apiClient()
  const ids = [...new Set((questionDocumentIds || []).filter(Boolean))]
  const existing = await fetchReviewExam(courseId)

  if (existing) {
    if (ids.length > 0) {
      const merged = [
        ...new Set([...(existing.questions || []).map((q) => q.documentId).filter(Boolean), ...ids]),
      ]
      const res = await api.put(`/exams/${existing.documentId}`, {
        data: { questions: { set: merged }, questionCount: merged.length },
      })
      return res.data?.data || existing
    }
    return existing
  }

  if (ids.length === 0) return null

  const res = await api.post('/exams', {
    data: {
      title: buildReviewExamTitle({ courseTitle, questionSetKey }),
      reviewType: REVIEW_TYPE,
      course: { connect: [courseId] },
      duration: 1,
      passingScore: 0,
      showResults: false,
      questionCount: ids.length,
      questions: { set: ids },
    },
  })
  return res?.data?.data || null
}

/** Save one answer key immediately so progress survives refresh/navigation. */
export async function saveReviewAnswer(questionDocumentId, correctAnswer) {
  const api = await apiClient()
  await api.put(`/questions/${questionDocumentId}`, {
    data: { correctAnswer, answerStatus: 'fromQuiz' },
  })
}

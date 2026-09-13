/** Page size used by the admin manage lists (matches AdminChapters). */
export const ADMIN_PAGE_SIZE = 25

/**
 * Strapi query params for the paginated questions list (AdminQuestions).
 *
 * Kept as a pure function so the exact request shape can be unit-tested: the
 * list is paginated server-side, so the course/type filters and the free-text
 * search must travel with every page request, otherwise page 2+ would show
 * unfiltered results.
 *
 * Search mirrors the fields the admin UI used to scan client-side:
 * textLv/textRu/textEn, the three option JSON columns and correctAnswer.
 */
export function buildQuestionListParams({
  page = 1,
  pageSize = ADMIN_PAGE_SIZE,
  course = 'all',
  type = 'all',
  search = '',
  sort = 'createdAt:desc',
} = {}) {
  const params = {
    'populate[0]': 'course',
    'populate[1]': 'media',
    'populate[2]': 'chapter',
    sort,
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  }

  if (course && course !== 'all') {
    params['filters[course][documentId][$eq]'] = course
  }
  if (type && type !== 'all') {
    params['filters[type][$eq]'] = type
  }

  const query = String(search || '').trim()
  if (query) {
    const searchableFields = [
      'textLv',
      'textRu',
      'textEn',
      'optionsLv',
      'optionsRu',
      'optionsEn',
      'correctAnswer',
    ]
    searchableFields.forEach((field, index) => {
      params[`filters[$or][${index}][${field}][$containsi]`] = query
    })
  }

  return params
}

/** Params for the "max order in this course" lookup used when auto-numbering. */
export function buildNextQuestionOrderParams(courseDocumentId) {
  return {
    'filters[course][documentId][$eq]': courseDocumentId,
    'sort': 'order:desc',
    'pagination[page]': 1,
    'pagination[pageSize]': 1,
    'fields[0]': 'order',
  }
}

// questionImport.js
// ---------------------------------------------------------------------------
// Shared duplicate-detection + merge helpers used by BOTH the Word importer
// (AdminImport) and the PDF importer (AdminPdfImport). Keeping the identity
// rules in one place means repeated imports never create duplicates, missing
// translations get attached, and existing answers are never overwritten with
// null — regardless of which importer ran first.
//
// Identity: courseId + sourceDocumentKey + order (see buildQuestionIdentity).
// Questions created before sourceDocumentKey existed (legacy rows, e.g. Word
// imports) are matched by order alone and "adopted" — so a PDF import merges
// into a previously Word-imported question instead of duplicating it.
// ---------------------------------------------------------------------------

import { normalizeQuestionText } from './pdfQuestionParser'

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Fetch every question belonging to a course (paginated), ordered by order.
 * Used to preload the existing question set before planning an import.
 */
export async function fetchAllExistingQuestions(courseId) {
  let page = 1
  let all = []

  while (true) {
    const res = await apiGetQuestions(courseId, page)
    const items = res?.data?.data || []
    all = [...all, ...items]

    const { pagination } = res?.data?.meta || {}
    if (!pagination || page >= pagination.pageCount) break
    page++
  }

  return all
}

// Separated so tests can stub the HTTP call easily.
async function apiGetQuestions(courseId, page) {
  const { default: api } = await import('../api/strapi')
  return api.get('/questions', {
    params: {
      'filters[course][documentId][$eq]': courseId,
      'pagination[page]': page,
      'pagination[pageSize]': 100,
      'sort': 'order:asc',
    },
  })
}

/**
 * Stable identity for one parsed question. `order` is the ORIGINAL document
 * number — never renumbered from the array index.
 */
export function buildQuestionIdentity({ courseId, sourceDocumentKey, order }) {
  return {
    courseId,
    sourceDocumentKey: sourceDocumentKey || null,
    order: Number(order),
  }
}

/**
 * Find the existing question matching an identity:
 *   - when a sourceDocumentKey is given, prefer key + order; fall back to a
 *     legacy question (no sourceDocumentKey) with the same order so old Word
 *     imports are adopted instead of duplicated
 *   - without a sourceDocumentKey (Word importer), plain order match
 * Returns the existing question or null.
 */
export function findExistingQuestion(existing, identity) {
  if (!existing || !existing.length) return null

  if (identity.sourceDocumentKey) {
    const keyed = existing.find(
      (e) => e.sourceDocumentKey === identity.sourceDocumentKey && Number(e.order) === identity.order,
    )
    if (keyed) return keyed
    const legacy = existing.find(
      (e) => !e.sourceDocumentKey && Number(e.order) === identity.order,
    )
    return legacy || null
  }

  return existing.find((e) => Number(e.order) === identity.order) || null
}

/**
 * Build a patch with only the translations that actually changed (EN/LV/RU),
 * compared on normalized text. Never touches correctAnswer / answerStatus —
 * existing answers are preserved by construction.
 */
export function buildMultilingualPatch(existing, parsed) {
  const patch = {}
  for (const lang of ['en', 'lv', 'ru']) {
    const key = `text${cap(lang)}`
    if (normalizeQuestionText(existing?.[key]) !== normalizeQuestionText(parsed?.[key])) {
      patch[key] = parsed?.[key] ?? ''
    }
  }
  return patch
}

/**
 * Never overwrite an existing correct answer with null/undefined. Strips
 * correctAnswer from `data` when the existing question already has one and the
 * import does not provide a new one.
 */
export function preserveCorrectAnswer(existing, data) {
  if (!existing || existing.correctAnswer == null) return data
  if (data.correctAnswer != null) return data
  const { correctAnswer: _answer, answerStatus: _status, ...rest } = data
  return rest
}

/**
 * Decide what to do with each parsed question against the existing set.
 *
 * Returns an array aligned with `parsed`:
 *   { action: 'create', q }
 *   { action: 'skip',   q, existing }             identical text
 *   { action: 'update', q, existing, patch }      translation changed / added
 *   { action: 'conflict', q, existing, reason }   same order, different source
 *
 * Recommended behavior table (from the spec):
 *   new question                        → create
 *   same question, no answer            → skip
 *   same question, new translation      → update translation
 *   same question, existing answer      → preserve answer (update translations)
 *   same order but changed text/source  → conflict for admin review
 */
export function planQuestionActions(parsed, existing, { courseId, sourceDocumentKey }) {
  const all = existing || []
  return parsed.map((q) => {
    const identity = buildQuestionIdentity({ courseId, sourceDocumentKey, order: q.order })
    const eq = findExistingQuestion(all, identity)

    if (!eq) {
      // No identity match — but a question with the same order from a DIFFERENT
      // source already exists? That is a conflict, not a create.
      const orderCollision = all.find((e) => Number(e.order) === Number(q.order))
      if (orderCollision) {
        return { action: 'conflict', q, existing: orderCollision, reason: 'same-order-different-source' }
      }
      return { action: 'create', q }
    }

    const sameSource = !eq.sourceDocumentKey || eq.sourceDocumentKey === (sourceDocumentKey || '')
    if (!sameSource) {
      return { action: 'conflict', q, existing: eq, reason: 'same-order-different-source' }
    }

    const textsEqual =
      normalizeQuestionText(eq.textEn) === normalizeQuestionText(q.textEn) &&
      normalizeQuestionText(eq.textLv) === normalizeQuestionText(q.textLv) &&
      normalizeQuestionText(eq.textRu) === normalizeQuestionText(q.textRu)

    if (textsEqual) {
      return { action: 'skip', q, existing: eq }
    }

    return { action: 'update', q, existing: eq, patch: buildMultilingualPatch(eq, q) }
  })
}

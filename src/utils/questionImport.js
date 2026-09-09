// questionImport.js
// ---------------------------------------------------------------------------
// Shared duplicate-detection + merge helpers used by the unified import page
// (Word + multilingual PDF + single-language PDFs). Keeping the identity and
// merge rules in one place means repeated imports never create duplicates,
// missing translations get attached, and existing answers are never
// overwritten with null — regardless of which file type ran first.
//
// Identity chain (see findExistingQuestion):
//   1. questionSetKey + order        — exact set match (new model)
//   2. sourceDocumentKey + order     — old PDF importer identity
//   3. order only (legacy)           — pre-set questions are \"adopted\"
// Different questionSetKeys (e.g. kumite-2024 vs kumite-2026) are SEPARATE
// sets and never match each other.
// ---------------------------------------------------------------------------

import { normalizeQuestionText, hashText } from './pdfQuestionParser'

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const LANGS = ['en', 'lv', 'ru']

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
export function buildQuestionIdentity({ courseId, sourceDocumentKey, questionSetKey, order }) {
  return {
    courseId,
    sourceDocumentKey: sourceDocumentKey || null,
    questionSetKey: questionSetKey || null,
    order: Number(order),
  }
}

/**
 * Find the existing question matching an identity, walking the chain:
 *   1. questionSetKey + order (exact set)
 *   2. legacy adoption: a pre-set question (no questionSetKey) with the same
 *      order — so old Word/PDF imports merge instead of duplicating
 *   3. sourceDocumentKey + order (old PDF importer identity)
 *   4. plain order match (old Word importer identity)
 * Questions from a DIFFERENT questionSetKey are never matched.
 * Returns the existing question or null.
 */
export function findExistingQuestion(existing, identity) {
  if (!existing || !existing.length) return null
  const order = Number(identity.order)

  if (identity.questionSetKey) {
    const keyed = existing.find(
      (e) => e.questionSetKey === identity.questionSetKey && Number(e.order) === order,
    )
    if (keyed) return keyed
    // Legacy adopt: pre-set questions merge into the new set by order.
    return existing.find((e) => !e.questionSetKey && Number(e.order) === order) || null
  }

  if (identity.sourceDocumentKey) {
    const keyed = existing.find(
      (e) => e.sourceDocumentKey === identity.sourceDocumentKey && Number(e.order) === order,
    )
    if (keyed) return keyed
    const legacy = existing.find(
      (e) => !e.sourceDocumentKey && !e.questionSetKey && Number(e.order) === order,
    )
    return legacy || null
  }

  return existing.find((e) => Number(e.order) === order) || null
}

/**
 * Build a patch with only the translations that actually changed (EN/LV/RU),
 * compared on normalized text. Never touches correctAnswer / answerStatus —
 * existing answers are preserved by construction.
 */
export function buildMultilingualPatch(existing, parsed) {
  const patch = {}
  for (const lang of LANGS) {
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

/** Attach content hashes for change detection (textHashEn/Lv/Ru). */
export function attachQuestionHashes(q) {
  const hashes = {}
  for (const lang of LANGS) {
    const key = `text${cap(lang)}`
    hashes[`textHash${cap(lang)}`] = q[key] ? hashText(q[key]) : null
  }
  return { ...q, ...hashes }
}

// ── In-session merge (multiple files → one Question per number) ────────────

/**
 * Merge questions parsed from ALL uploaded files of one import session into a
 * single normalized Question per `order`. Languages are filled from whichever
 * file carries them; a Word-derived correctAnswer wins over a PDF's null;
 * sourceFiles accumulate. Same order + same language + different text is
 * recorded as a session conflict.
 *
 * @param {Array} parsedList  flat list of parsed questions (Word + PDF results)
 * @returns {Array} merged questions sorted by order
 */
export function mergeSessionQuestions(parsedList) {
  const byOrder = new Map()

  const ensure = (order) => {
    let entry = byOrder.get(order)
    if (!entry) {
      entry = {
        order,
        type: 'yes_no',
        textEn: '',
        textLv: '',
        textRu: '',
        correctAnswer: null,
        answerStatus: 'missing',
        sourceFiles: [],
        sessionConflicts: [],
      }
      byOrder.set(order, entry)
    }
    return entry
  }

  for (const q of parsedList) {
    if (q.order == null || !Number.isFinite(Number(q.order))) continue
    const order = Number(q.order)
    const entry = ensure(order)

    for (const lang of LANGS) {
      const key = `text${cap(lang)}`
      const incoming = normalizeQuestionText(q[key])
      if (!incoming) continue
      const existing = normalizeQuestionText(entry[key])
      if (!existing) {
        entry[key] = q[key]
      } else if (existing !== incoming) {
        entry.sessionConflicts.push({
          lang,
          order,
          existingText: entry[key],
          importedText: q[key],
        })
      }
    }

    if (q.type) entry.type = q.type
    // Word answers win; a PDF never overwrites an existing answer with null.
    if (q.correctAnswer != null) {
      entry.correctAnswer = q.correctAnswer
      entry.answerStatus = q.answerStatus || 'fromWord'
    }
    if (Array.isArray(q.sourceFiles)) {
      for (const f of q.sourceFiles) {
        if (f && !entry.sourceFiles.includes(f)) entry.sourceFiles.push(f)
      }
    }
  }

  return [...byOrder.values()].sort((a, b) => a.order - b.order)
}

// ── DB comparison / conflict detection ─────────────────────────────────────

/**
 * Compare one parsed question against the existing set and decide what to do:
 *
 *   { action: 'create',   q }                                nothing exists
 *   { action: 'skip',     q, existing }                      identical texts
 *   { action: 'update',   q, existing, patch }               translations added/changed
 *   { action: 'conflict', q, existing, patch, conflicts }    same text differs / type differs
 *
 * correctAnswer is NEVER part of the patch — existing answers are preserved by
 * construction; a PDF's null never overwrites an existing answer.
 */
export function mergeImportedQuestions(parsed, existing, { courseId, questionSetKey }) {
  const all = existing || []
  return parsed.map((q) => {
    const identity = buildQuestionIdentity({ courseId, questionSetKey, order: q.order })
    const eq = findExistingQuestion(all, identity)

    if (!eq) {
      return { q, existing: null, action: 'create', patch: null, conflicts: [], hasAnswer: false }
    }

    const patch = {}
    const conflicts = []
    for (const lang of LANGS) {
      const key = `text${cap(lang)}`
      const imported = normalizeQuestionText(q[key])
      const existingText = normalizeQuestionText(eq[key])
      if (!imported) continue // nothing to add — never erase existing text
      if (!existingText) {
        patch[key] = q[key] // new translation
        continue
      }
      if (imported !== existingText) {
        conflicts.push({ lang, existingText: eq[key], importedText: q[key] })
      }
    }
    if (eq.type && q.type && eq.type !== q.type) {
      conflicts.push({ lang: 'type', existingText: eq.type, importedText: q.type })
    }

    if (conflicts.length > 0) {
      return { q, existing: eq, action: 'conflict', patch, conflicts, hasAnswer: eq.correctAnswer != null }
    }
    if (Object.keys(patch).length > 0) {
      return { q, existing: eq, action: 'update', patch, conflicts: [], hasAnswer: eq.correctAnswer != null }
    }
    return { q, existing: eq, action: 'skip', patch: null, conflicts: [], hasAnswer: eq.correctAnswer != null }
  })
}

// ── Validation stats ───────────────────────────────────────────────────────

/** Per-language coverage + numbering stats for the merged import preview. */
export function buildQuestionStats(questions) {
  if (!questions || !questions.length) return null
  const texts = (q, lang) => normalizeQuestionText(q[`text${cap(lang)}`])
  const missing = (lang) => questions.filter((q) => !texts(q, lang)).map((q) => q.order)
  const orders = questions.map((q) => q.order).sort((a, b) => a - b)
  const seen = new Set()
  const duplicates = []
  const gaps = []
  for (const o of orders) {
    if (seen.has(o)) duplicates.push(o)
    seen.add(o)
  }
  for (let o = orders[0]; o <= orders[orders.length - 1]; o++) {
    if (!seen.has(o)) gaps.push(o)
  }

  return {
    total: questions.length,
    completeTranslations: questions.filter(
      (q) => texts(q, 'en') && texts(q, 'lv') && texts(q, 'ru'),
    ).length,
    missingEn: missing('en'),
    missingLv: missing('lv'),
    missingRu: missing('ru'),
    answersMissing: questions.filter((q) => q.correctAnswer == null).length,
    duplicates: [...new Set(duplicates)],
    gaps,
    firstOrder: questions.length ? questions[0].order : null,
    lastOrder: questions.length ? questions[questions.length - 1].order : null,
    sessionConflicts: questions.flatMap((q) => q.sessionConflicts || []),
  }
}

// ── Legacy planner (kept for the old Word importer semantics + tests) ──────

/**
 * Decide what to do with each parsed question against the existing set.
 * Returns an array aligned with `parsed`:
 *   { action: 'create', q }
 *   { action: 'skip',   q, existing }             identical text
 *   { action: 'update', q, existing, patch }      translation changed / added
 *   { action: 'conflict', q, existing, reason }   same order, different source
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

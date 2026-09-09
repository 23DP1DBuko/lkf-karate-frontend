// Frontend mirror of backend/src/utils/grading.js — the SERVER remains the
// source of truth for scores; these helpers only drive the UI (rendering,
// navigation rules, admin review totals, legacy-data normalization).

const ANSWER_FIELD_LANGS = ['Lv', 'Ru', 'En']

export function isOpenTextQuestion(q) {
  return q?.type === 'open_text'
}

/**
 * Number of answer fields for an open-text question (falls back to 1 for
 * legacy questions without configuration).
 */
export function getAnswerFieldCount(q) {
  if (!isOpenTextQuestion(q)) return 1
  let max = 0
  for (const lang of ANSWER_FIELD_LANGS) {
    const arr = q?.[`answerFields${lang}`]
    if (Array.isArray(arr) && arr.length > max) max = arr.length
  }
  return Math.max(1, max)
}

/**
 * Normalize a stored open-text answer into an array of strings.
 * Legacy strings become single-element arrays; arrays pass through.
 */
export function normalizeOpenTextAnswer(value) {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value.map(v => (v == null ? '' : String(v)))
  }
  return [String(value)]
}

/**
 * Per-field manual grades for one question (legacy number + new object
 * formats). Returns { [fieldIndex]: 1 | 0 }.
 */
export function getFieldGrades(manualGrades, qid, fieldCount) {
  const out = {}
  const g = manualGrades ? manualGrades[qid] : undefined
  if (g == null) return out

  if (typeof g === 'number' || typeof g === 'string') {
    out[0] = Number(g) === 1 ? 1 : 0
    return out
  }

  if (typeof g === 'object') {
    for (let i = 0; i < fieldCount; i++) {
      const v = g[i]
      if (v === 1 || v === '1') out[i] = 1
      else if (v === 0 || v === '0') out[i] = 0
    }
  }
  return out
}

/**
 * An open-text question counts as answered when at least one field has text.
 * (Empty fields score 0 — partial answers must not block submission.)
 */
export function isOpenTextAnswered(value) {
  const fields = normalizeOpenTextAnswer(value)
  return fields.some(v => String(v ?? '').trim() !== '')
}

/**
 * Per-question maximum points: open-text = field count, else 1.
 */
export function getQuestionMaxPoints(q) {
  return isOpenTextQuestion(q) ? getAnswerFieldCount(q) : 1
}

/**
 * Auto-grade non-open-text questions (same rule as the server).
 */
export function autoGradeQuestion(q, userAnswer) {
  if (isOpenTextQuestion(q)) return false

  const correctAnswers =
    q?.type === 'multiple_choice' &&
    Array.isArray(q.correctAnswers) &&
    q.correctAnswers.length > 0
      ? q.correctAnswers
      : null

  if (correctAnswers) {
    if (!Array.isArray(userAnswer)) return false
    const a = userAnswer.map(String).sort().join('|')
    const b = correctAnswers.map(String).sort().join('|')
    return a === b
  }

  return (
    String(userAnswer ?? '').toLowerCase() ===
    String(q?.correctAnswer ?? '').toLowerCase()
  )
}

/**
 * Points earned for one question given answers + manual grades.
 */
export function getQuestionPoints(q, userAnswer, manualGrades) {
  if (isOpenTextQuestion(q)) {
    const count = getAnswerFieldCount(q)
    const grades = getFieldGrades(manualGrades, q?.id, count)
    let sum = 0
    for (let i = 0; i < count; i++) {
      if (grades[i] === 1) sum += 1
    }
    return Math.min(sum, count)
  }
  return autoGradeQuestion(q, userAnswer) ? 1 : 0
}

/**
 * Full exam totals used by the admin review UI (mirrors the server's
 * computeScore: totalPoints / maxPoints / percentage).
 */
export function computeReviewTotals(questions, answers, manualGrades) {
  const list = Array.isArray(questions) ? questions : []
  const ans = answers && typeof answers === 'object' ? answers : {}
  let totalPoints = 0
  let maxPoints = 0
  for (const q of list) {
    maxPoints += getQuestionMaxPoints(q)
    totalPoints += getQuestionPoints(q, ans[q?.id], manualGrades)
  }
  const percent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
  return { totalPoints, maxPoints, percent }
}

/**
 * Effective decision for one answer field of an open-text question:
 * the exam-specific override wins, otherwise the question-bank decision.
 */
export function getEffectiveFieldDecision(q, fieldIndex, examDecision) {
  if (examDecision === 'correct') return 'correct'
  if (examDecision === 'incorrect') return 'incorrect'
  return getBankDecision(q, fieldIndex) ? 'correct' : 'incorrect'
}

export function getBankDecision(q, fieldIndex) {
  if (!isOpenTextQuestion(q)) return true
  for (const lang of ANSWER_FIELD_LANGS) {
    const arr = q?.[`answerFields${lang}`]
    if (Array.isArray(arr) && arr[fieldIndex] != null) {
      return arr[fieldIndex].correct !== false
    }
  }
  return true
}

/**
 * Expected-answer text (answer-bank reference) for one field, language-aware
 * with an Lv → En fallback.
 */
export function getExpectedAnswer(q, fieldIndex, language) {
  if (!isOpenTextQuestion(q)) return q?.correctAnswer || ''
  const order =
    language === 'ru'
      ? ['Ru', 'Lv', 'En']
      : language === 'en'
        ? ['En', 'Lv', 'Ru']
        : ['Lv', 'En', 'Ru']
  for (const lang of order) {
    const arr = q?.[`answerFields${lang}`]
    if (Array.isArray(arr) && arr[fieldIndex] != null) {
      const expected = arr[fieldIndex].expected
      if (expected != null && String(expected).trim() !== '') {
        return String(expected)
      }
    }
  }
  return ''
}

/**
 * Update one field grade in a manualGrades map (immutable-ish). Handles
 * legacy number values by upgrading to the per-field object shape.
 */
export function setFieldGrade(manualGrades, qid, fieldIndex, grade) {
  const source = manualGrades && typeof manualGrades === 'object' ? manualGrades : {}
  const current =
    source[qid] && typeof source[qid] === 'object' && !Array.isArray(source[qid])
      ? { ...source[qid] }
      : {}
  current[fieldIndex] = grade === 1 ? 1 : 0
  return { ...source, [qid]: current }
}

/**
 * Is a manualGrades entry missing entirely (never reviewed)?
 */
export function isQuestionReviewed(manualGrades, qid) {
  return !!(manualGrades && manualGrades[qid] !== undefined && manualGrades[qid] !== null)
}

/**
 * Build the admin editor's per-field rows from a stored question. Falls back
 * to a single legacy field (expected answer = correctAnswer) when the
 * question has no answer-field configuration yet.
 */
export function buildAnswerFieldsFromQuestion(question) {
  const lv = Array.isArray(question?.answerFieldsLv) ? question.answerFieldsLv : []
  const ru = Array.isArray(question?.answerFieldsRu) ? question.answerFieldsRu : []
  const en = Array.isArray(question?.answerFieldsEn) ? question.answerFieldsEn : []
  const count = Math.max(1, lv.length, ru.length, en.length)

  if (lv.length === 0 && ru.length === 0 && en.length === 0) {
    return [{
      expectedLv: question?.correctAnswer || '',
      expectedRu: '',
      expectedEn: '',
      correct: true,
    }]
  }

  return Array.from({ length: count }, (_, i) => ({
    expectedLv: lv[i]?.expected ?? '',
    expectedRu: ru[i]?.expected ?? '',
    expectedEn: en[i]?.expected ?? '',
    correct: (lv[i]?.correct ?? ru[i]?.correct ?? en[i]?.correct ?? true) !== false,
  }))
}
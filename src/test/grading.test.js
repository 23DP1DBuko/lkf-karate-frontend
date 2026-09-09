import { describe, it, expect } from 'vitest'
import {
  getAnswerFieldCount,
  normalizeOpenTextAnswer,
  getFieldGrades,
  isOpenTextAnswered,
  getQuestionMaxPoints,
  getQuestionPoints,
  computeReviewTotals,
  getBankDecision,
  getEffectiveFieldDecision,
  getExpectedAnswer,
  setFieldGrade,
} from '../utils/grading'

const openText6 = {
  id: 1,
  type: 'open_text',
  answerFieldsLv: Array.from({ length: 6 }, (_, i) => ({ expected: `A${i}`, correct: true })),
}

const openText11 = {
  id: 2,
  type: 'open_text',
  answerFieldsLv: Array.from({ length: 11 }, (_, i) => ({ expected: `B${i}`, correct: true })),
}

const yesNo = { id: 3, type: 'yes_no', correctAnswer: 'true' }
const mc = { id: 4, type: 'multiple_choice', correctAnswers: ['x', 'y'] }

describe('getAnswerFieldCount', () => {
  it('returns 6 for a 6-field question', () => {
    expect(getAnswerFieldCount(openText6)).toBe(6)
  })

  it('returns 11 for an 11-field question', () => {
    expect(getAnswerFieldCount(openText11)).toBe(11)
  })

  it('falls back to 1 for legacy open-text questions', () => {
    expect(getAnswerFieldCount({ id: 5, type: 'open_text' })).toBe(1)
  })

  it('returns 1 for choice questions', () => {
    expect(getAnswerFieldCount(yesNo)).toBe(1)
  })
})

describe('normalizeOpenTextAnswer', () => {
  it('converts legacy strings to single-element arrays', () => {
    expect(normalizeOpenTextAnswer('kata')).toEqual(['kata'])
  })

  it('passes arrays through', () => {
    expect(normalizeOpenTextAnswer(['a', '', 'c'])).toEqual(['a', '', 'c'])
  })

  it('handles null/undefined', () => {
    expect(normalizeOpenTextAnswer(null)).toEqual([])
    expect(normalizeOpenTextAnswer(undefined)).toEqual([])
  })
})

describe('isOpenTextAnswered', () => {
  it('true when at least one field has text', () => {
    expect(isOpenTextAnswered(['', 'criteria', ''])).toBe(true)
    expect(isOpenTextAnswered('legacy text')).toBe(true)
  })

  it('false when all fields are empty', () => {
    expect(isOpenTextAnswered(['', '', ''])).toBe(false)
    expect(isOpenTextAnswered(null)).toBe(false)
  })
})

describe('getFieldGrades (legacy + new formats)', () => {
  it('upgrades legacy number grades', () => {
    expect(getFieldGrades({ 1: 1 }, 1, 1)).toEqual({ 0: 1 })
    expect(getFieldGrades({ 1: 0 }, 1, 1)).toEqual({ 0: 0 })
  })

  it('reads per-field objects', () => {
    expect(getFieldGrades({ 1: { 0: 1, 2: 0 } }, 1, 3)).toEqual({ 0: 1, 2: 0 })
  })

  it('missing grade means not reviewed', () => {
    expect(getFieldGrades({ 1: {} }, 1, 3)).toEqual({})
  })
})

describe('scoring', () => {
  it('max points = field count for open text', () => {
    expect(getQuestionMaxPoints(openText6)).toBe(6)
    expect(getQuestionMaxPoints(openText11)).toBe(11)
    expect(getQuestionMaxPoints(yesNo)).toBe(1)
  })

  it('sums correct fields and caps at the field count', () => {
    const grades = { 1: { 0: 1, 1: 1, 2: 0, 3: 1 } }
    expect(getQuestionPoints(openText6, ['a', 'b'], grades)).toBe(3)

    // cannot exceed configured fields even with a malicious grade map
    const tooMany = { 1: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 } }
    expect(getQuestionPoints(openText6, [], tooMany)).toBe(6)
  })

  it('auto-grades yes/no and multiple choice as before', () => {
    expect(getQuestionPoints(yesNo, 'true', {})).toBe(1)
    expect(getQuestionPoints(yesNo, 'false', {})).toBe(0)
    expect(getQuestionPoints(mc, ['y', 'x'], {})).toBe(1)
    expect(getQuestionPoints(mc, ['x'], {})).toBe(0)
  })
})

describe('computeReviewTotals', () => {
  it('includes open-text points in the exam total', () => {
    const questions = [yesNo, openText6]
    const answers = { 3: 'true', 1: ['a', 'b', 'c'] }
    const manualGrades = { 1: { 0: 1, 1: 1, 2: 0, 3: 1 } }
    const totals = computeReviewTotals(questions, answers, manualGrades)
    expect(totals.totalPoints).toBe(4) // 1 (yes/no) + 3 (fields)
    expect(totals.maxPoints).toBe(7) // 1 + 6
    expect(totals.percent).toBe(Math.round((4 / 7) * 100))
  })

  it('handles legacy string answers + legacy number grades', () => {
    const totals = computeReviewTotals(
      [openText6],
      { 1: 'one answer' },
      { 1: 1 },
    )
    expect(totals.totalPoints).toBe(1)
    expect(totals.maxPoints).toBe(6)
  })
})

describe('bank decisions', () => {
  it('reads the correct flag', () => {
    expect(getBankDecision(openText6, 0)).toBe(true)
    const q = { type: 'open_text', answerFieldsLv: [{ expected: 'x', correct: false }] }
    expect(getBankDecision(q, 0)).toBe(false)
  })

  it('exam override wins over the bank', () => {
    expect(getEffectiveFieldDecision(openText6, 0, 'incorrect')).toBe('incorrect')
    expect(getEffectiveFieldDecision(openText6, 0, undefined)).toBe('correct')
  })

  it('returns the expected answer with language fallback', () => {
    const q = {
      type: 'open_text',
      answerFieldsLv: [{ expected: 'LV', correct: true }],
      answerFieldsEn: [{ expected: 'EN', correct: true }],
    }
    expect(getExpectedAnswer(q, 0, 'lv')).toBe('LV')
    expect(getExpectedAnswer(q, 0, 'en')).toBe('EN')
    expect(getExpectedAnswer(q, 0, 'ru')).toBe('LV')
  })
})

describe('setFieldGrade', () => {
  it('adds a field grade without mutating the input', () => {
    const before = { 1: { 0: 1 } }
    const after = setFieldGrade(before, 1, 1, 0)
    expect(before).toEqual({ 1: { 0: 1 } })
    expect(after).toEqual({ 1: { 0: 1, 1: 0 } })
  })

  it('upgrades a legacy number grade', () => {
    expect(setFieldGrade({ 1: 1 }, 1, 0, 0)).toEqual({ 1: { 0: 0 } })
  })
})
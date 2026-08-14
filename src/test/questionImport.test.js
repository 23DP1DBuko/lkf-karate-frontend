import { describe, it, expect } from 'vitest'
import {
  buildQuestionIdentity,
  findExistingQuestion,
  buildMultilingualPatch,
  preserveCorrectAnswer,
  planQuestionActions,
} from '../utils/questionImport'

const COURSE = 'course-doc-1'
const SOURCE_KEY = 'kumite-questions-07-2026'

function parsed(order, { en, lv, ru } = {}) {
  return {
    order,
    textEn: en ?? `EN ${order}`,
    textLv: lv ?? `LV ${order}`,
    textRu: ru ?? `RU ${order}`,
    type: 'yes_no',
    correctAnswer: null,
    answerStatus: 'missing',
  }
}

describe('buildQuestionIdentity', () => {
  it('normalizes order to a number and keeps the source key', () => {
    expect(buildQuestionIdentity({ courseId: COURSE, sourceDocumentKey: SOURCE_KEY, order: '41' })).toEqual({
      courseId: COURSE,
      sourceDocumentKey: SOURCE_KEY,
      order: 41,
    })
    expect(buildQuestionIdentity({ courseId: COURSE, order: 7 }).sourceDocumentKey).toBeNull()
  })
})

describe('findExistingQuestion', () => {
  const existing = [
    { documentId: 'd1', order: 41, sourceDocumentKey: SOURCE_KEY },
    { documentId: 'd2', order: 42, sourceDocumentKey: null }, // legacy (Word import)
    { documentId: 'd3', order: 43, sourceDocumentKey: 'other-source' },
  ]

  it('matches by source key + order', () => {
    expect(findExistingQuestion(existing, { courseId: COURSE, sourceDocumentKey: SOURCE_KEY, order: 41 }))
      .toBe(existing[0])
  })

  it('adopts legacy questions (no source key) with the same order', () => {
    expect(findExistingQuestion(existing, { courseId: COURSE, sourceDocumentKey: SOURCE_KEY, order: 42 }))
      .toBe(existing[1])
  })

  it('does NOT match a different source with the same order', () => {
    expect(findExistingQuestion(existing, { courseId: COURSE, sourceDocumentKey: SOURCE_KEY, order: 43 }))
      .toBeNull()
  })

  it('falls back to plain order match without a source key (Word behavior)', () => {
    expect(findExistingQuestion(existing, { courseId: COURSE, order: 43 })).toBe(existing[2])
    expect(findExistingQuestion(existing, { courseId: COURSE, order: 999 })).toBeNull()
  })
})

describe('planQuestionActions', () => {
  it('creates when nothing exists', () => {
    const plan = planQuestionActions([parsed(1)], [], { courseId: COURSE, sourceDocumentKey: SOURCE_KEY })
    expect(plan[0].action).toBe('create')
  })

  it('skips identical questions (answers untouched)', () => {
    const existing = [{
      documentId: 'd1', order: 1, sourceDocumentKey: SOURCE_KEY,
      textEn: 'EN 1', textLv: 'LV 1', textRu: 'RU 1', correctAnswer: 'true',
    }]
    const plan = planQuestionActions([parsed(1)], existing, { courseId: COURSE, sourceDocumentKey: SOURCE_KEY })
    expect(plan[0].action).toBe('skip')
    expect(plan[0].existing.correctAnswer).toBe('true') // preserved
  })

  it('updates changed translations and preserves the existing answer', () => {
    const existing = [{
      documentId: 'd1', order: 1, sourceDocumentKey: SOURCE_KEY,
      textEn: 'OLD EN', textLv: 'LV 1', textRu: 'RU 1', correctAnswer: 'false',
    }]
    const plan = planQuestionActions([parsed(1)], existing, { courseId: COURSE, sourceDocumentKey: SOURCE_KEY })
    expect(plan[0].action).toBe('update')
    expect(plan[0].patch).toEqual({ textEn: 'EN 1' })
    // patch must never carry an answer
    expect('correctAnswer' in plan[0].patch).toBe(false)
  })

  it('flags same order from a different source as conflict', () => {
    const existing = [{
      documentId: 'd1', order: 1, sourceDocumentKey: 'other-source',
      textEn: 'Other doc text', textLv: 'LV', textRu: 'RU',
    }]
    const plan = planQuestionActions([parsed(1)], existing, { courseId: COURSE, sourceDocumentKey: SOURCE_KEY })
    expect(plan[0].action).toBe('conflict')
    expect(plan[0].reason).toBe('same-order-different-source')
  })

  it('adopts and updates legacy questions without a source key', () => {
    const existing = [{
      documentId: 'd1', order: 1, sourceDocumentKey: null,
      textEn: 'OLD', textLv: 'LV 1', textRu: 'RU 1', correctAnswer: 'true',
    }]
    const plan = planQuestionActions([parsed(1)], existing, { courseId: COURSE, sourceDocumentKey: SOURCE_KEY })
    expect(plan[0].action).toBe('update')
    expect(plan[0].patch).toEqual({ textEn: 'EN 1' })
  })

  it('detects an order collision with a keyed question from another source as conflict', () => {
    const existing = [{
      documentId: 'd1', order: 5, sourceDocumentKey: 'kata-questions-2025',
      textEn: 'X', textLv: 'Y', textRu: 'Z',
    }]
    const plan = planQuestionActions([parsed(5)], existing, { courseId: COURSE, sourceDocumentKey: SOURCE_KEY })
    expect(plan[0].action).toBe('conflict')
  })
})

describe('preserveCorrectAnswer', () => {
  it('strips a null answer when the existing question already has one', () => {
    const existing = { correctAnswer: 'true' }
    const out = preserveCorrectAnswer(existing, { textEn: 'x', correctAnswer: null, answerStatus: 'missing' })
    expect(out).toEqual({ textEn: 'x' })
  })

  it('keeps a provided new answer', () => {
    const existing = { correctAnswer: 'true' }
    const out = preserveCorrectAnswer(existing, { textEn: 'x', correctAnswer: 'false' })
    expect(out.correctAnswer).toBe('false')
  })

  it('passes data through when there is nothing to preserve', () => {
    const existing = { correctAnswer: null }
    const data = { textEn: 'x', correctAnswer: null }
    expect(preserveCorrectAnswer(existing, data)).toEqual(data)
  })
})

describe('buildMultilingualPatch', () => {
  it('only includes fields that changed', () => {
    const existing = { textEn: 'same', textLv: 'old lv', textRu: 'same ru' }
    const parsedQ = { textEn: 'same', textLv: 'new lv', textRu: 'same ru' }
    expect(buildMultilingualPatch(existing, parsedQ)).toEqual({ textLv: 'new lv' })
  })

  it('treats whitespace differences as equal', () => {
    const existing = { textEn: 'Hello  world', textLv: 'x', textRu: 'y' }
    const parsedQ = { textEn: ' Hello world ', textLv: 'x', textRu: 'y' }
    expect(buildMultilingualPatch(existing, parsedQ)).toEqual({})
  })
})

import { describe, it, expect } from 'vitest'
import {
  buildQuestionSetKey,
  parseQuestionSetKey,
  detectLanguageFromFilename,
  detectLanguageFromText,
  detectSingleLanguagePdf,
} from '../utils/questionSet'

describe('buildQuestionSetKey', () => {
  it('builds a key from category + year', () => {
    expect(buildQuestionSetKey({ category: 'kumite', year: '2024' })).toBe('kumite-2024')
    expect(buildQuestionSetKey({ category: 'KATA', year: '2026' })).toBe('kata-2026')
  })

  it('normalizes category and ignores empty parts', () => {
    expect(buildQuestionSetKey({ category: 'kumite', year: '' })).toBe('kumite')
    expect(buildQuestionSetKey({ category: '', year: '2024' })).toBe('2024')
    expect(buildQuestionSetKey({ category: '', year: '' })).toBe('')
  })
})

describe('parseQuestionSetKey', () => {
  it('splits a key back into category and year', () => {
    expect(parseQuestionSetKey('kumite-2024')).toEqual({ category: 'kumite', year: '2024' })
    expect(parseQuestionSetKey('kata-2026')).toEqual({ category: 'kata', year: '2026' })
  })
})

describe('detectLanguageFromFilename', () => {
  it('detects _eng / _english suffixes', () => {
    expect(detectLanguageFromFilename('allquestions_kumite_eng.pdf')).toBe('en')
    expect(detectLanguageFromFilename('2024_Kata_questions_english.pdf')).toBe('en')
  })

  it('detects _lat / _latvian suffixes', () => {
    expect(detectLanguageFromFilename('allquestions_lat.pdf')).toBe('lv')
    expect(detectLanguageFromFilename('Kumite_jautajumi_latvian.pdf')).toBe('lv')
  })

  it('detects _rus / _russian suffixes', () => {
    expect(detectLanguageFromFilename('allquestionskumite_rus.pdf')).toBe('ru')
    expect(detectLanguageFromFilename('2024_Kata_questions_RUS-1.pdf')).toBe('ru')
  })

  it('returns null when nothing matches', () => {
    expect(detectLanguageFromFilename('questions_2024.pdf')).toBeNull()
  })
})

describe('detectLanguageFromText', () => {
  it('detects English markers', () => {
    expect(detectLanguageFromText('TRUE OR FALSE\nExamination Questions')).toBe('en')
  })

  it('detects Latvian markers', () => {
    expect(detectLanguageFromText('PATIESI VAI APLAMI\nEksāmena jautājumi')).toBe('lv')
  })

  it('detects Russian markers', () => {
    expect(detectLanguageFromText('ПРАВДА ИЛИ ЛОЖЬ\nЭкзаменационные вопросы')).toBe('ru')
    expect(detectLanguageFromText('По русски')).toBe('ru')
  })

  it('returns null when nothing matches', () => {
    expect(detectLanguageFromText('Some random question text')).toBeNull()
  })
})

describe('detectSingleLanguagePdf', () => {
  it('prefers content markers over filename', () => {
    expect(detectSingleLanguagePdf('ПРАВДА ИЛИ ЛОЖЬ', 'allquestions_eng.pdf')).toEqual({
      language: 'ru',
      confidence: 'high',
    })
  })

  it('falls back to the filename hint', () => {
    expect(detectSingleLanguagePdf('1. Question one.', 'allquestions_rus.pdf')).toEqual({
      language: 'ru',
      confidence: 'low',
    })
  })

  it('returns null when nothing can be determined', () => {
    expect(detectSingleLanguagePdf('1. Question one.', 'questions.pdf')).toEqual({
      language: null,
      confidence: null,
    })
  })
})

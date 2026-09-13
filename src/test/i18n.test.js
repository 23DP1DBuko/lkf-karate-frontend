import { describe, it, expect } from 'vitest'
import lv from '../i18n/locales/lv.json'
import ru from '../i18n/locales/ru.json'
import en from '../i18n/locales/en.json'

function flattenKeys(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenKeys(v, key, out)
    } else {
      out.push(key)
    }
  }
  return out
}

describe('i18n locale parity', () => {
  const lvKeys = flattenKeys(lv)
  const ruKeys = flattenKeys(ru)
  const enKeys = flattenKeys(en)

  it('lv, ru and en expose exactly the same translation keys', () => {
    expect([...ruKeys].sort()).toEqual([...lvKeys].sort())
    expect([...enKeys].sort()).toEqual([...lvKeys].sort())
  })

  it('every answer-field label/error/preview key is translated in all languages', () => {
    const keys = [
      'admin.questions.answerFieldsLabel',
      'admin.questions.answerFieldsHint',
      'admin.questions.answerFieldN',
      'admin.questions.addAnswerField',
      'admin.questions.removeAnswerField',
      'admin.questions.minOneField',
      'admin.questions.maxAnswerFields',
      'admin.questions.emptyExpectedWarning',
      'admin.questions.expectedAnswerHint',
      'admin.questions.answerFieldExampleN',
      'admin.questions.exampleLv',
      'admin.questions.exampleRu',
      'admin.questions.exampleEn',
      'admin.questions.exampleAnswersNote',
      'admin.questions.studentPreviewTitle',
      'admin.questions.studentPreviewHint',
      'admin.questions.answerCountDecrease',
      'admin.questions.answerCountIncrease',
      'admin.questions.answerCountShrinkConfirm',
      'exam.answerField',
      'exam.answerFieldsInstruction',
      'admin.importSet.reviewExamCreated',
      'admin.importSet.startReview',
      'admin.importQuiz.reviewedOf',
      'admin.importQuiz.reviewCompleted',
      'admin.exams.reviewBadge',
      // chapter import preview (per-block editing)
      'admin.chaptersImport.previewWarning',
      'admin.chaptersImport.editLanguage',
      'admin.chaptersImport.baseBadge',
      'admin.chaptersImport.languageEmpty',
      'admin.chaptersImport.copyFromBase',
      'admin.chaptersImport.edited',
      'admin.chaptersImport.imageDescription',
      'admin.chaptersImport.imageCaptured',
      'admin.chaptersImport.imageMissing',
      'admin.chaptersImport.tableCaption',
      'admin.chaptersImport.tableText',
      'admin.chaptersImport.regenerateTableText',
      'admin.chaptersImport.blockTextPlaceholder',
      'admin.chaptersImport.blockListPlaceholder',
      'admin.questions.count',
      'admin.questions.total',
      // shared admin list pagination
      'common.paginationLabel',
      'common.paginationShowing',
      'common.paginationPrevious',
      'common.paginationNext',
      'common.paginationPage',
    ]
    const get = (loc, dotted) => dotted.split('.').reduce((o, k) => o?.[k], loc)
    for (const key of keys) {
      expect(get(lv, key), `lv missing ${key}`).toBeTruthy()
      expect(get(ru, key), `ru missing ${key}`).toBeTruthy()
      expect(get(en, key), `en missing ${key}`).toBeTruthy()
    }
  })

  it('uses the required plain-language wording for the admin open-text editor (en)', () => {
    const q = en.admin.questions
    expect(q.answerFieldsLabel).toBe('Number of answers')
    expect(q.answerFieldN).toBe('Answer {{n}}')
    expect(q.answerFieldExampleN).toBe('Answer {{n}} example')
    expect(q.exampleLv).toBe('Example (lv)')
    expect(q.exampleRu).toBe('Example (ru)')
    expect(q.exampleEn).toBe('Example (en)')
    expect(q.addAnswerField).toBe('Add answer field')
    expect(q.removeAnswerField).toBe('Remove answer field')
  })
})
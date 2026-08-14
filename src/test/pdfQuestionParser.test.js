import { describe, it, expect } from 'vitest'
import {
  parsePdfQuestions,
  normalizeSourceKey,
  normalizeQuestionText,
  buildReport,
} from '../utils/pdfQuestionParser'

// ── Mock pdfjs ─────────────────────────────────────────────────────────────
// text item: { str, transform: [a,b,c,d,e(x),f(y)], width }
function item(str, x, y, w = 6) {
  return { str, transform: [1, 0, 0, 1, x, y], width: w }
}

function makePdfjs(pages) {
  return {
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: pages.length,
        getPage: async (p) => ({
          getViewport: () => ({ width: 612, height: 792 }),
          getTextContent: async () => ({ items: pages[p - 1] }),
        }),
      }),
    }),
  }
}

function fakeFile(name) {
  return { name, arrayBuffer: async () => new ArrayBuffer(8) }
}

// Page geometry used by the fixture: columns at No.(44) EN(95) LV(255) RU(425),
// header at y=740, footer band below y=90.
const HEADER = [
  item('No.', 40, 740, 20),
  item('English', 90, 740, 30),
  item('Latviešu valodā', 250, 740, 60),
  item('По русски', 420, 740, 40),
]

const page1 = [
  item('TRUE OR FALSE', 180, 770, 80),
  ...HEADER,
  // Q41
  item('41', 44, 690, 12),
  item('Any voluntary religious headwear can be worn.', 95, 690, 80),
  item('Brīvprātīgi var lietot jebkādas reliģiskas galvassegas', 255, 690, 90),
  item('Можно носить любые религиозные головные уборы на выбор', 425, 690, 100),
  // Q42 — EN split across two items in the same row (column joining)
  item('42', 44, 640, 12),
  item('The Karate Gi jacket must be more than three-quarters', 95, 640, 50),
  item('thigh length.', 145, 640, 40),
  item('Karate-gi jakai jābūt garākai kā trīs ceturtdaļas augšstilba garuma', 255, 640, 110),
  item('Куртка каратэ-ги должна быть длиннее трех четвертей длины бедра', 425, 640, 110),
  // Q43 — starts here, continues on page 2 (page break in the middle)
  item('43', 44, 590, 12),
  item('A referee must always', 95, 590, 60),
  item('Tiesnesim vienmēr', 255, 590, 60),
  item('Рефери всегда', 425, 590, 60),
]

const page2 = [
  ...HEADER,
  // Footer page numbers — must be ignored: absolute bottom strip (y=20)
  // and an isolated page number near the bottom (y=40)
  item('2', 300, 20, 10),
  item('3', 300, 40, 10),
  // Q43 continuation (no number → appends to Q43)
  item('wear white gloves.', 95, 690, 60),
  item('jāvalkā balti cimdi.', 255, 690, 60),
  item('должен носить белые перчатки.', 425, 690, 70),
  // Q44 — Russian text missing on purpose
  item('44', 44, 640, 12),
  item('The competition area is 8x8 meters.', 95, 640, 80),
  item('Sacensību laukums ir 8x8 metri.', 255, 640, 80),
  // Duplicate number 41
  item('41', 44, 590, 12),
  item('A duplicate number row.', 95, 590, 60),
  item('Dublēta numura rinda.', 255, 590, 60),
  item('Строка с дублирующимся номером.', 425, 590, 70),
  // Q45 — non-sequential number preserved
  item('45', 44, 540, 12),
  item('Fifth question.', 95, 540, 40),
  item('Piektais jautājums.', 255, 540, 40),
  item('Пятый вопрос.', 425, 540, 40),
]

describe('parsePdfQuestions', () => {
  it('parses multilingual questions into one entity per number', async () => {
    const pdfjs = makePdfjs([page1, page2])
    const result = await parsePdfQuestions(pdfjs, fakeFile('ENG_LAT_RUS_Kumite_Questions_07_2026.pdf'))

    expect(result.typeDetected).toBe(true)
    expect(result.questions.length).toBe(6)

    const q1 = result.questions[0]
    expect(q1.order).toBe(41) // original number preserved, not renumbered
    expect(q1.textEn).toBe('Any voluntary religious headwear can be worn.')
    expect(q1.textLv).toBe('Brīvprātīgi var lietot jebkādas reliģiskas galvassegas')
    expect(q1.textRu).toBe('Можно носить любые религиозные головные уборы на выбор')
    expect(q1.type).toBe('yes_no')
    expect(q1.options).toEqual(['true', 'false'])
    expect(q1.correctAnswer).toBeNull() // never inferred
    expect(q1.answerStatus).toBe('missing')
  })

  it('joins split items within a column', async () => {
    const pdfjs = makePdfjs([page1, page2])
    const result = await parsePdfQuestions(pdfjs, fakeFile('questions.pdf'))
    const q2 = result.questions.find((q) => q.order === 42)
    expect(q2.textEn).toBe('The Karate Gi jacket must be more than three-quarters thigh length.')
  })

  it('keeps a question open across a page break', async () => {
    const pdfjs = makePdfjs([page1, page2])
    const result = await parsePdfQuestions(pdfjs, fakeFile('questions.pdf'))
    const q3 = result.questions.find((q) => q.order === 43)
    expect(q3.textEn).toBe('A referee must always wear white gloves.')
    expect(q3.textLv).toBe('Tiesnesim vienmēr jāvalkā balti cimdi.')
    expect(q3.textRu).toBe('Рефери всегда должен носить белые перчатки.')
    expect(q3.sourcePages).toEqual([1, 2])
  })

  it('preserves non-sequential numbers and reports duplicates + missing translations', async () => {
    const pdfjs = makePdfjs([page1, page2])
    const result = await parsePdfQuestions(pdfjs, fakeFile('questions.pdf'))
    const report = result.report

    expect(report.total).toBe(6)
    expect(report.firstOrder).toBe(41)
    expect(report.lastOrder).toBe(45)
    expect(report.duplicateOrders).toEqual([41])
    expect(report.missingRu).toEqual([44])
    expect(report.missingEn).toEqual([])
    expect(report.missingLv).toEqual([])
    expect(report.completeTranslations).toBe(5)
    expect(report.answersMissing).toBe(6)

    // The duplicate number must NOT be silently renumbered
    const dup = result.questions.filter((q) => q.order === 41)
    expect(dup.length).toBe(2)
    expect(dup.every((q) => q.warnings.includes('duplicate-number'))).toBe(true)
  })

  it('ignores footer page numbers', async () => {
    const pdfjs = makePdfjs([page1, page2])
    const result = await parsePdfQuestions(pdfjs, fakeFile('questions.pdf'))
    // Footer "2" (absolute strip) and "3" (isolated page number) must not
    // create questions or append garbage
    const q43 = result.questions.find((q) => q.order === 43)
    expect(q43.textEn).not.toMatch(/^[23]\b/)
    expect(result.questions.some((q) => q.order === 2 || q.order === 3)).toBe(false)
  })

  it('does not skip a real question row that sits near the bottom edge', async () => {
    // A row at y=57 with the number AND all three languages must be parsed
    // even though it is below the old fixed footer band.
    const pdfjs = makePdfjs([
      [
        ...HEADER,
        item('34', 44, 120, 12),
        item('Previous question.', 95, 120, 50),
        item('Iepriekšējais jautājums.', 255, 120, 50),
        item('Предыдущий вопрос.', 425, 120, 50),
        // Q35 — near the bottom of the page
        item('35', 44, 57, 12),
        item('If an Athlete acts maliciously,', 95, 57, 60),
        item('Ja Sportista rīcība ir klaji ļauna,', 255, 57, 60),
        item('Если участник действует злонамеренно,', 425, 57, 70),
        // wrapped continuation below it
        item('HANSOKU is the correct penalty.', 95, 44, 60),
        item('sods būs HANSOKU.', 255, 44, 50),
        item('ХАНСОКУ является правильным наказанием.', 425, 44, 70),
      ],
    ])
    const result = await parsePdfQuestions(pdfjs, fakeFile('questions.pdf'))
    const q35 = result.questions.find((q) => q.order === 35)
    expect(q35).toBeDefined()
    expect(q35.textEn).toBe('If an Athlete acts maliciously, HANSOKU is the correct penalty.')
    expect(q35.textLv).toBe('Ja Sportista rīcība ir klaji ļauna, sods būs HANSOKU.')
    expect(q35.textRu).toBe('Если участник действует злонамеренно, ХАНСОКУ является правильным наказанием.')
  })

  it('reports orphan rows as malformed when no question is open', async () => {
    const pdfjs = makePdfjs([
      [
        item('Stray instruction text before the table.', 90, 700, 80),
        ...HEADER,
        item('41', 44, 650, 12),
        item('First real question.', 95, 650, 60),
        item('Pirmais īstais jautājums.', 255, 650, 60),
        item('Первый настоящий вопрос.', 425, 650, 60),
      ],
    ])
    const result = await parsePdfQuestions(pdfjs, fakeFile('questions.pdf'))
    expect(result.report.malformedRows.length).toBeGreaterThan(0)
    expect(result.questions.length).toBe(1)
  })

  it('falls back to rough column boundaries when no header exists', async () => {
    const pdfjs = makePdfjs([
      [
        item('41', 44, 690, 12),
        item('English text here.', 95, 690, 50),
        item('Latviešu teksts šeit.', 255, 690, 50),
        item('Русский текст здесь.', 425, 690, 50),
      ],
    ])
    const result = await parsePdfQuestions(pdfjs, fakeFile('questions.pdf'))
    expect(result.questions.length).toBe(1)
    expect(result.report.lowConfidencePages).toContain(1)
  })
})

describe('normalizeSourceKey', () => {
  it('strips language tags and extension', () => {
    expect(normalizeSourceKey('ENG_LAT_RUS_Kumite_Questions_07_2026.pdf')).toBe('kumite-questions-07-2026')
    expect(normalizeSourceKey('Kumite_Questions_07_2026.pdf')).toBe('kumite-questions-07-2026')
    expect(normalizeSourceKey('Kumite Questions (07 2026).pdf')).toBe('kumite-questions-07-2026')
  })

  it('falls back to a stable hash for degenerate names', () => {
    const a = normalizeSourceKey('eng.pdf')
    const b = normalizeSourceKey('eng.pdf')
    expect(a).toBe(b)
    expect(a.startsWith('doc-')).toBe(true)
  })
})

describe('buildReport + normalizeQuestionText', () => {
  it('normalizes whitespace', () => {
    expect(normalizeQuestionText('  Hello   world\t there ')).toBe('Hello world there')
  })

  it('reports answers missing for every parsed question', () => {
    const qs = [
      { order: 1, textEn: 'a', textLv: 'b', textRu: 'c', warnings: [] },
      { order: 2, textEn: 'd', textLv: '', textRu: 'f', warnings: [] },
    ]
    const report = buildReport(qs, [], [], true)
    expect(report.total).toBe(2)
    expect(report.completeTranslations).toBe(1)
    expect(report.missingLv).toEqual([2])
    expect(report.answersMissing).toBe(2)
    expect(report.typeDetected).toBe(true)
  })
})

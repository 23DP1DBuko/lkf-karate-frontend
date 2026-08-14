// pdfQuestionParser.js
// ---------------------------------------------------------------------------
// Parses a multilingual True/False question-bank PDF into normalized question
// objects (one Question per number, EN/LV/RU stored together, no answer).
//
// The source documents are 4-column tables:
//   No. | English | Latviešu valodā | По русски
//   (number) (EN text) (LV text) (RU text)
//
// PDFs are notoriously messy, so this parser NEVER trusts line breaks or plain
// text extraction. Instead it works with text coordinates:
//   - text items (x, y, width) from pdfjs text content
//   - items grouped into visual rows by y
//   - rows split into the four columns using x-boundaries detected from the
//     repeated header row ("English" / "Latviešu valodā" / "По русски")
//   - a row whose number column matches ^\d+ starts a NEW question; any other
//     row is continuation text appended to the current (open) question
//   - questions stay open across page breaks — only a new number closes them
//
// Output question shape (one per source number):
//   { order, textEn, textLv, textRu, type: 'yes_no', options, correctAnswer: null,
//     answerStatus: 'missing', warnings, sourcePages }
//
// The parser also produces a validation report (missing/duplicate numbers,
// missing language texts, malformed rows) so the admin can review problems
// BEFORE anything is imported.
// ---------------------------------------------------------------------------

const FOOTER_BAND_Y = 25        // PDF y < 25 → very bottom strip (skip)
const ROW_Y_TOLERANCE = 5       // y tolerance for grouping items into a visual row
const COLUMN_GAP = 8            // min gap between header cells to be distinct columns
const MIN_HEADER_CELLS = 2      // a header row must have at least these many cells

// ── Column header detection ────────────────────────────────────────────────
// The table header repeats on (nearly) every page: "No. | English | Latviešu
// valodā | По русски". We match each cell independently so a missing cell or a
// translated variant does not break the whole page.
const HEADER_PATTERNS = [
  { key: 'no',  re: /^no\.?$/i },
  { key: 'en',  re: /english|angļu|англ/i },
  { key: 'lv',  re: /latvie|latvian|латыш/i },
  { key: 'ru',  re: /по\s*русски|russian|krievu/i },
]

// ── TRUE OR FALSE detection (first-page instructions) ──────────────────────
const TRUE_OR_FALSE_RE = /true\s*or\s*false|patiesi\s*vai\s*aplami|правда\s*или\s*ложь/i

// A question number cell: "1", "41", optionally "1." / "1)" or with trailing
// whitespace. Anything else in the number column is NOT a new question.
const NUMBER_CELL_RE = /^\d{1,4}[.)]?\s*$/

// ── Small helpers ──────────────────────────────────────────────────────────

export function normalizeQuestionText(text) {
  return String(text == null ? '' : text)
    .replace(/\s+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

/**
 * Normalize a source file name into a stable source document key used for
 * duplicate detection: course + sourceDocumentKey + order.
 *
 * Language-tag tokens are stripped so ENG_LAT_RUS_Kumite_Questions_07_2026.pdf
 * and Kumite_Questions_07_2026.pdf produce the same key.
 *
 *   "ENG_LAT_RUS_Kumite_Questions_07_2026.pdf" → "kumite-questions-07-2026"
 */
const LANGUAGE_TOKENS = new Set([
  'eng', 'en', 'english',
  'lat', 'lv', 'latvian', 'latviesu', 'latviešu', 'latviski',
  'rus', 'ru', 'russian', 'krievu', 'krieviski',
  'англ', 'рус', 'лат', 'ltf', 'lks', 'wkf', 'englatrus', 'latruseng',
])

export function normalizeSourceKey(fileName) {
  const base = String(fileName || '')
    .replace(/\.pdf$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter((t) => t && !LANGUAGE_TOKENS.has(t))
    .join('-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base) return base
  // Degenerate case (e.g. the whole name was language tags): fall back to a
  // stable hash of the original name so re-imports still dedupe.
  return `doc-${cyrb53(String(fileName || 'unknown').toLowerCase())}`
}

// ── Coordinate pipeline ────────────────────────────────────────────────────

/**
 * Group raw text items into visual rows (same baseline y) and return the rows
 * top-to-bottom with their items sorted left-to-right.
 */
function groupItemsIntoRows(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows = []
  for (const it of sorted) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(last.y - it.y) <= ROW_Y_TOLERANCE) {
      last.items.push(it)
    } else {
      rows.push({ y: it.y, items: [it] })
    }
  }
  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x)
    row.text = row.items.map((i) => i.text).join(' ')
  }
  return rows
}

/**
 * Find the header row on a page (the one containing the column labels) and
 * return the x position where each column STARTS (sorted, includes the number
 * column when present). Returns null when the page has no recognizable header.
 */
function detectColumnStarts(row) {
  if (!row) return null
  const matched = []
  for (const it of row.items) {
    const hit = HEADER_PATTERNS.find((p) => p.re.test(normalizeQuestionText(it.text)))
    if (hit && !matched.some((m) => m.key === hit.key)) {
      matched.push({ key: hit.key, x: it.x, w: it.w })
    }
  }
  matched.sort((a, b) => a.x - b.x)
  // Need at least "English | Latviešu | По русски" — 3 real content columns.
  // A header with only 2 cells cannot separate the three languages reliably.
  const contentCols = matched.filter((m) => m.key !== 'no')
  if (contentCols.length < 3) return null

  const colStarts = contentCols.map((c) => c.x)
  const cellAt = (x) => matched.find((m) => m.x === x)
  for (let i = 0; i < colStarts.length - 1; i++) {
    const left = cellAt(colStarts[i])
    const right = cellAt(colStarts[i + 1])
    // distinct columns must not overlap
    if (right.x - (left.x + (left.w || 0)) < COLUMN_GAP) return null
  }

  // The number column header ("No.") may sit left of the first content column.
  const noCol = matched.find((m) => m.key === 'no')
  if (noCol && noCol.x < colStarts[0] - COLUMN_GAP) {
    colStarts.unshift(noCol.x)
  }
  return colStarts
}

/**
 * Turn column STARTS into x-boundaries that separate the columns.
 *
 * Midpoints between column starts are NOT enough: table columns are wide and
 * nearly touch, so an EN word can extend to x=285 while LV starts at x=310 —
 * a midpoint boundary at ~202 would chop the EN text in half.
 *
 * Instead, for each gap the boundary is placed at the midpoint between the
 * next column's start and the RIGHTMOST item that begins before that start
 * (such an item can only belong to the previous column).
 */
function computeBoundaries(starts, centers) {
  const bounds = []
  for (let i = 0; i < starts.length - 1; i++) {
    const next = starts[i + 1]
    const below = centers.filter((c) => c < next)
    if (below.length) {
      const maxBelow = Math.max(...below)
      bounds.push(maxBelow > starts[i] ? (maxBelow + next) / 2 : (next + starts[i]) / 2)
    } else {
      bounds.push((next + starts[i]) / 2)
    }
  }
  return bounds
}

function isHeaderRow(row) {
  // A row counts as the table header only when it carries (at least) all three
  // language labels as separate cells. Question text that merely contains a
  // word like "English" or "Latviešu" must not be mistaken for a header row.
  const labelMatches = HEADER_PATTERNS.filter((p) => p.key !== 'no')
    .filter((p) => row.items.some((it) => p.re.test(normalizeQuestionText(it.text))))
  return labelMatches.length >= 3
}

function isFooterRow(row) {
  if (row.y < FOOTER_BAND_Y) return true
  // Isolated page-number footer near the bottom ("5", "- 5 -", "Page 5").
  // A real question row at the bottom edge has the number AND language text,
  // so a single standalone item that looks like a page number is safe to skip.
  if (row.y < 60 && row.items.length === 1) {
    const t = row.items[0].text.trim()
    if (/^\d{1,3}$/.test(t) || /^-\s*\d{1,3}\s*-$/.test(t) || /page\s*\d+/i.test(t)) {
      return true
    }
  }
  return false
}

/**
 * Assign every item of a row to a column by its center x. boundaries splits
 * the page into (boundaries.length + 1) columns; col 0 is the number column.
 */
function assignColumns(row, boundaries) {
  const cols = new Array(boundaries.length + 1).fill(null).map(() => [])
  for (const it of row.items) {
    const center = it.x + (it.w || 0) / 2
    let col = 0
    while (col < boundaries.length && center >= boundaries[col]) col++
    cols[col].push(it.text)
  }
  return cols.map((items) => normalizeQuestionText(items.join(' ')))
}

// ── Main parse ─────────────────────────────────────────────────────────────

/**
 * Parse a multilingual True/False question PDF.
 *
 * @param {object} pdfjsLib        the pdfjs-dist module (already configured)
 * @param {File|ArrayBuffer} file  the PDF file
 * @param {object} options         { onProgress }
 * @returns {Promise<{ questions, report, sourceFileName, typeDetected }>}
 */
export async function parsePdfQuestions(pdfjsLib, file, options = {}) {
  const { onProgress = null } = options

  const data = file instanceof ArrayBuffer || ArrayBuffer.isView(file)
    ? file
    : await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({ data }).promise

  // 1. Extract per-page text items with coordinates
  const pages = []
  for (let p = 1; p <= pdf.numPages; p++) {
    if (onProgress) onProgress({ page: p, total: pdf.numPages })
    const page = await pdf.getPage(p)
    const vp = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const items = content.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({
        x: it.transform[4],
        y: it.transform[5],
        w: it.width || 0,
        text: normalizeQuestionText(it.str),
      }))
    pages.push({ pageIndex: p - 1, pageH: vp.height, items, raw: content.items })
  }

  // 2. Detect the question type from the instruction text
  const typeDetected = pages.some((pg) =>
    groupItemsIntoRows(pg.items).some((r) => TRUE_OR_FALSE_RE.test(r.text)),
  )

  // 3. Walk every page, grouping items into rows and columns
  const questions = []       // { order, textEn, textLv, textRu, ... }
  const byOrder = new Map()   // duplicate-number detection
  const malformedRows = []   // rows that could not belong to any question
  const lowConfidencePages = []
  let current = null         // open question (stays open across page breaks)
  let lastStarts = null      // column starts carried across pages

  for (const pg of pages) {
    const rows = groupItemsIntoRows(pg.items)
    const dataRows = rows.filter((r) => !isFooterRow(r) && !isHeaderRow(r))

    // 3a. Find the column starts: header row on this page, else carried over.
    let starts = null
    for (const row of rows) {
      if (isFooterRow(row)) continue
      const detected = detectColumnStarts(row)
      if (detected && isHeaderRow(row)) {
        starts = detected
        break
      }
    }
    if (!starts && lastStarts) starts = lastStarts
    if (!starts) {
      // No header anywhere yet — assume the first four items of the first
      // data row are the column starts. Low confidence; flagged for review.
      for (const row of dataRows) {
        const xs = [...new Set(row.items.map((it) => Math.round(it.x)))].sort((a, b) => a - b)
        if (xs.length >= 4) {
          starts = xs.slice(0, 4)
          lowConfidencePages.push(pg.pageIndex + 1)
          break
        }
      }
    }
    if (starts) lastStarts = starts

    // 3b. Boundaries: refine the starts with the page's actual item positions.
    const centers = []
    for (const row of dataRows) {
      for (const it of row.items) centers.push(it.x + (it.w || 0) / 2)
    }
    const boundaries = starts ? computeBoundaries(starts, centers) : null

    // 3c. Parse rows into questions.
    for (const row of rows) {
      if (isFooterRow(row)) continue
      if (isHeaderRow(row)) continue

      const cols = boundaries ? assignColumns(row, boundaries) : [row.text]
      const numberCell = cols[0] || ''

      if (NUMBER_CELL_RE.test(numberCell)) {
        const order = parseInt(numberCell.replace(/[.)]/g, ''), 10)
        current = {
          order,
          textEn: '',
          textLv: '',
          textRu: '',
          type: 'yes_no',
          options: ['true', 'false'],
          correctAnswer: null,
          answerStatus: 'missing',
          warnings: [],
          sourcePages: [pg.pageIndex + 1],
        }
        questions.push(current)
        if (byOrder.has(order)) {
          current.warnings.push('duplicate-number')
          byOrder.get(order).warnings.push('duplicate-number')
        }
        byOrder.set(order, current)
        appendColumns(current, cols)
      } else if (current) {
        // Continuation: wrapped line, or the question spills onto the next page.
        // Only append when the row actually carries content; ignore stray
        // numbers / empty rows.
        const hasContent = cols.some((c) => c && c !== numberCell && c.length > 0)
        if (hasContent) {
          appendColumns(current, cols)
          if (current.sourcePages[current.sourcePages.length - 1] !== pg.pageIndex + 1) {
            current.sourcePages.push(pg.pageIndex + 1)
          }
        } else if (numberCell && !NUMBER_CELL_RE.test(numberCell) && /^\d/.test(numberCell)) {
          malformedRows.push({ page: pg.pageIndex + 1, text: row.text, reason: 'unrecognized-number-cell' })
        }
      } else if (row.text.trim()) {
        // No open question yet and this row is not a question start — orphan
        // content (usually instruction text before the first table row).
        malformedRows.push({ page: pg.pageIndex + 1, text: row.text, reason: 'orphan-row' })
      }
    }
  }

  // 4. Finalize: clean extraction artifacts in the assembled texts
  for (const q of questions) {
    q.textEn = cleanPdfText(q.textEn)
    q.textLv = cleanPdfText(q.textLv)
    q.textRu = cleanPdfText(q.textRu)
  }

  // 5. Validation report
  const report = buildReport(questions, malformedRows, lowConfidencePages, typeDetected)

  return {
    questions,
    report,
    sourceFileName: file?.name || 'document.pdf',
    typeDetected,
  }
}

function appendColumns(q, cols) {
  // cols: [number, en, lv, ru]. Extra columns beyond 4 (or missing ones) are
  // ignored / handled by validation — never guess a column.
  const en = cols[1] || ''
  const lv = cols[2] || ''
  const ru = cols[3] || ''
  q.textEn = joinContinuation(q.textEn, en)
  q.textLv = joinContinuation(q.textLv, lv)
  q.textRu = joinContinuation(q.textRu, ru)
}

function joinContinuation(prev, next) {
  if (!next) return prev
  return prev ? `${prev} ${next}` : next
}

/**
 * Repair common PDF text-extraction artifacts in the assembled language text:
 *   - "three - quarters", "Karate - gi", "каратэ - ги" → hyphen without spaces
 *   - "Karate G i" → "Karate Gi" (kerning split of an abbreviation)
 * Kept deliberately conservative — multi-letter words after a space are left
 * untouched so legitimate single-letter words like "a" are never joined.
 */
export function cleanPdfText(text) {
  return String(text || '')
    .replace(/\s*-\s*/g, '-')
    .replace(/(^|[\s(])([A-ZĀČĒĢĪĶĻŅŠŪŽ])(\s+)([a-zāčēģīķļņšūž])(?=[\s),.;!?]|$)/g, (m, pre, letter, sp, ch) =>
      `${pre}${letter}${ch}`)
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Validation ─────────────────────────────────────────────────────────────

export function buildReport(questions, malformedRows, lowConfidencePages, typeDetected) {
  const seen = new Map()
  const duplicateOrders = new Set()
  const missingNumbers = []

  for (const q of questions) {
    if (q.warnings.includes('duplicate-number')) duplicateOrders.add(q.order)
    if (q.order == null || !Number.isFinite(q.order)) missingNumbers.push(q.order)
    seen.set(q.order, (seen.get(q.order) || 0) + 1)
  }

  const missingEn = questions.filter((q) => !q.textEn).map((q) => q.order)
  const missingLv = questions.filter((q) => !q.textLv).map((q) => q.order)
  const missingRu = questions.filter((q) => !q.textRu).map((q) => q.order)
  const completeTranslations = questions.filter((q) => q.textEn && q.textLv && q.textRu).length

  return {
    total: questions.length,
    completeTranslations,
    missingEn,
    missingLv,
    missingRu,
    missingNumbers,
    duplicateOrders: [...duplicateOrders],
    malformedRows,
    lowConfidencePages: [...new Set(lowConfidencePages)],
    // Imported without answers by design — every question needs the admin key.
    answersMissing: questions.length,
    typeDetected: !!typeDetected,
    firstOrder: questions.length ? questions[0].order : null,
    lastOrder: questions.length ? questions[questions.length - 1].order : null,
  }
}

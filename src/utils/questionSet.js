// questionSet.js
// ---------------------------------------------------------------------------
// Question-set helpers for the unified import flow.
//
// A question set is identified by a stable key built from category + year,
// e.g. `kumite-2024`. Different years are DIFFERENT sets — `kumite-2024` and
// `kumite-2026` never merge with each other.
//
// Also hosts the language auto-detection used for single-language PDFs and
// Word files: filename hints first (e.g. `_eng`, `_rus`), then content markers
// (e.g. \"TRUE OR FALSE\" → English, \"PATIESI VAI APLAMI\" → Latvian,
// \"ПРАВДА ИЛИ ЛОЖЬ\" → Russian). The admin can always override.
// ---------------------------------------------------------------------------

/** Build a stable question-set key, e.g. buildQuestionSetKey({ category: 'kumite', year: '2024' }) → 'kumite-2024'. */
export function buildQuestionSetKey({ category, year }) {
  const cat = String(category || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const yr = String(year || '').trim()
  if (!cat && !yr) return ''
  return [cat, yr].filter(Boolean).join('-')
}

/** Split a question-set key back into { category, year }. */
export function parseQuestionSetKey(key) {
  const [category, ...rest] = String(key || '').split('-')
  return { category: category || '', year: rest.join('-') || '' }
}

// ── Filename language hints ────────────────────────────────────────────────
// `_eng` / `_english` → English; `_lat` / `_latvian` → Latvian;
// `_rus` / `_russian` → Russian. Matches suffixes and word-boundary tags.
const FILENAME_HINTS = [
  { lang: 'en', re: /(^|[-_\s])(eng|english)([-_\s]|$)/i },
  { lang: 'lv', re: /(^|[-_\s])(lat|latvian|latviesu|latviešu|latviski)([-_\s]|$)/i },
  { lang: 'ru', re: /(^|[-_\s])(rus|russian|krievu|krieviski)([-_\s]|$)/i },
]

/** Detect a language from a file name ('en' | 'lv' | 'ru' | null). */
export function detectLanguageFromFilename(fileName) {
  // Strip the extension first so a trailing "_lat"/"_rus" tag still matches.
  const base = String(fileName || '').replace(/\.[^.]+$/, '')
  for (const hint of FILENAME_HINTS) {
    if (hint.re.test(base)) return hint.lang
  }
  return null
}

// ── Content markers ────────────────────────────────────────────────────────
// Note: Cyrillic words are matched with explicit (^|\s) anchors instead of \\b
// because JS \\b does not treat Cyrillic letters as word characters.
const TEXT_MARKERS = {
  en: [
    /\bexamination questions\b/i,
    /\btrue\s+or\s+false\b/i,
    /\benglish\b/i,
  ],
  lv: [
    /\beksāmena jautājumi\b/i,
    /\bpatiesi\s+vai\s+aplami\b/i,
    /\blatviešu valodā\b/i,
    /\blatviski\b/i,
  ],
  ru: [
    /(^|\s)экзаменационные\s+вопросы/i,
    /(^|\s)правда\s+или\s+ложь/i,
    /(^|\s)по\s+русски/i,
  ],
}

/**
 * Detect a language from extracted PDF text. Returns\null when nothing matches
 * and the most likely language otherwise. Scores each language by how many of
 * its markers appear; the first language with any hit wins (ties broken by\n
 * marker order).
 */
export function detectLanguageFromText(text) {
  const haystack = String(text || '')
  if (!haystack.trim()) return null
  let best = null
  for (const [lang, markers] of Object.entries(TEXT_MARKERS)) {
    if (markers.some((re) => re.test(haystack))) {
      best = lang
      break
    }
  }
  return best
}

/**
 * Combined detection for a single-language PDF: content markers first (strong),
 * then filename hints. Returns { language, confidence } with confidence
 * 'high' (content markers) or 'low' (filename only) or null.
 */
export function detectSingleLanguagePdf(pdfText, fileName) {
  const fromText = detectLanguageFromText(pdfText)
  if (fromText) return { language: fromText, confidence: 'high' }
  const fromName = detectLanguageFromFilename(fileName)
  if (fromName) return { language: fromName, confidence: 'low' }
  return { language: null, confidence: null }
}

export const LANG_LABELS = {
  en: '🇬🇧 English',
  lv: '🇱🇻 Latviešu',
  ru: '🇷🇺 Русский',
}

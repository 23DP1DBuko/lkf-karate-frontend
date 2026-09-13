// chapterImportBlocks.js
// ---------------------------------------------------------------------------
// Pure helpers behind /admin/chapters/import.
//
// The chapter content-type stores one JSON block array per language
// (blocksLv / blocksRu / blocksEn) plus a matching title field. The import
// preview therefore keeps, for every chapter, a `titles` and a `blocks` map
// keyed by language, and this module owns every transformation of that state:
//   • seeding the parsed PDF into the selected base language
//   • per-block editing (text / list / table / image)
//   • copying one language into another
//   • building the Strapi payload (with uploaded figures attached)
//
// Keeping it here (instead of inside the page component) means the logic is
// unit-testable and the page stays focused on layout.
// ---------------------------------------------------------------------------

export const CHAPTER_LANGUAGES = ['lv', 'ru', 'en']

const LANGUAGE_SUFFIX = { lv: 'Lv', ru: 'Ru', en: 'En' }

export const titleField = (language) => `title${LANGUAGE_SUFFIX[language] || 'Lv'}`
export const blocksField = (language) => `blocks${LANGUAGE_SUFFIX[language] || 'Lv'}`

export function emptyLanguageMap(makeValue = () => []) {
  return CHAPTER_LANGUAGES.reduce((acc, language) => {
    acc[language] = makeValue(language)
    return acc
  }, {})
}

/** Strip tags so a stored `<p>…</p>` block can be edited as plain text. */
export function htmlToPlainText(html) {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Rebuild the stored HTML for a text block from the editor's plain text. */
export function plainTextToHtml(text) {
  const lines = String(text == null ? '' : text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return ''
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
}

export function blockPlainText(block) {
  if (!block) return ''
  switch (block.type) {
    case 'text':
      return htmlToPlainText(block.content)
    case 'list':
      return (block.items || []).join('\n')
    case 'table':
      return block.content?.text || (block.content?.rows || []).map((r) => r.join(' | ')).join('\n')
    case 'image':
      return block.caption || block.alt || ''
    default:
      return typeof block.content === 'string' ? block.content : ''
  }
}

export function createBlock(type) {
  const id = (globalThis.crypto?.randomUUID?.() || `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`)
  switch (type) {
    case 'list':
      return { id, type: 'list', items: [''] }
    case 'table':
      return { id, type: 'table', content: { headers: ['Column'], rows: [['']], caption: '', text: '' } }
    case 'image':
      return { id, type: 'image', media: null, caption: '', alt: '' }
    default:
      return { id, type: 'text', content: '<p></p>' }
  }
}

/** Parsed chapters → editable preview state (titles/blocks keyed by language). */
export function toPreviewChapters(chapters, baseLanguage) {
  const language = CHAPTER_LANGUAGES.includes(baseLanguage) ? baseLanguage : 'lv'
  return (chapters || []).map((chapter) => ({
    ...chapter,
    baseLanguage: language,
    titles: { ...emptyLanguageMap(() => ''), [language]: chapter.title || '' },
    blocks: { ...emptyLanguageMap(), [language]: chapter.blocks || [] },
  }))
}

// Every edit marks the chapter as `edited` so the importer knows it must not
// skip it just because its parsed content hash still matches the stored one.
const replaceChapter = (chapters, index, updater) =>
  chapters.map((chapter, i) => {
    if (i !== index) return chapter
    const next = updater(chapter)
    return next === chapter ? chapter : { ...next, edited: true }
  })

export function updateChapterTitle(chapters, index, language, value) {
  return replaceChapter(chapters, index, (chapter) => ({
    ...chapter,
    titles: { ...chapter.titles, [language]: value },
  }))
}

export function updateBlock(chapters, chapterIndex, language, blockIndex, updated) {
  return replaceChapter(chapters, chapterIndex, (chapter) => {
    const blocks = chapter.blocks[language] || []
    const next = blocks.map((block, i) => (i === blockIndex ? updated : block))
    return { ...chapter, blocks: { ...chapter.blocks, [language]: next } }
  })
}

export function addBlock(chapters, chapterIndex, language, type) {
  return replaceChapter(chapters, chapterIndex, (chapter) => ({
    ...chapter,
    blocks: {
      ...chapter.blocks,
      [language]: [...(chapter.blocks[language] || []), createBlock(type)],
    },
  }))
}

export function removeBlock(chapters, chapterIndex, language, blockIndex) {
  return replaceChapter(chapters, chapterIndex, (chapter) => ({
    ...chapter,
    blocks: {
      ...chapter.blocks,
      [language]: (chapter.blocks[language] || []).filter((_, i) => i !== blockIndex),
    },
  }))
}

export function moveBlock(chapters, chapterIndex, language, blockIndex, direction) {
  return replaceChapter(chapters, chapterIndex, (chapter) => {
    const blocks = [...(chapter.blocks[language] || [])]
    const target = blockIndex + direction
    if (target < 0 || target >= blocks.length) return chapter
    ;[blocks[blockIndex], blocks[target]] = [blocks[target], blocks[blockIndex]]
    return { ...chapter, blocks: { ...chapter.blocks, [language]: blocks } }
  })
}

/** Copy title + blocks from one language into another (keeps block ids, so an
 *  uploaded figure is shared instead of uploaded twice). */
export function copyLanguage(chapters, chapterIndex, from, to) {
  return replaceChapter(chapters, chapterIndex, (chapter) => ({
    ...chapter,
    titles: { ...chapter.titles, [to]: chapter.titles[from] || '' },
    blocks: { ...chapter.blocks, [to]: (chapter.blocks[from] || []).map((block) => ({ ...block })) },
  }))
}

/**
 * The PDF lands in exactly one base language. When the admin switches that
 * language after parsing, the parsed content must follow it — otherwise the
 * saved `baseLanguage` field would point at an empty language.
 */
export function moveBaseLanguage(chapters, next) {
  return (chapters || []).map((chapter) => {
    const seeded = chapter.baseLanguage
    const hasNext = Boolean((chapter.titles?.[next] || '').trim()) || (chapter.blocks?.[next] || []).length > 0
    if (hasNext || !seeded || seeded === next) {
      return { ...chapter, baseLanguage: next }
    }
    return {
      ...chapter,
      baseLanguage: next,
      edited: true,
      titles: { ...chapter.titles, [next]: chapter.titles[seeded], [seeded]: '' },
      blocks: { ...chapter.blocks, [next]: chapter.blocks[seeded], [seeded]: [] },
    }
  })
}

export function countBlockTypes(blocks = []) {
  return blocks.reduce((acc, block) => {
    acc[block.type] = (acc[block.type] || 0) + 1
    return acc
  }, {})
}

export function blocksNeedingReview(blocks = []) {
  return blocks.filter((block) => block.needsReview).length
}

export function languageStats(chapter) {
  return CHAPTER_LANGUAGES.reduce((acc, language) => {
    const blocks = chapter.blocks?.[language] || []
    acc[language] = {
      title: (chapter.titles?.[language] || '').trim(),
      blocks: blocks.length,
      hasContent: Boolean((chapter.titles?.[language] || '').trim()) || blocks.length > 0,
    }
    return acc
  }, {})
}

/** Drop parser-only bookkeeping so the block is valid Strapi JSON. */
export function sanitizeBlock(block, mediaById = {}) {
  const { _figure, _sourcePage, ...rest } = block
  if (rest.type === 'image') {
    const media = mediaById[block.id] ?? rest.media ?? null
    return { ...rest, media }
  }
  return rest
}

export function sanitizeBlocks(blocks = [], mediaById = {}) {
  return blocks.map((block) => sanitizeBlock(block, mediaById))
}

/**
 * Build the `data` payload for one chapter across every language that has
 * content. Returns the same shape whether the chapter is being created or
 * updated (the caller adds `course` on create).
 */
export function buildChapterImportData(chapter, { mediaById = {}, courseDocumentId } = {}) {
  const data = {
    order: chapter.order,
    baseLanguage: chapter.baseLanguage,
    sourceMode: 'pdf',
    sourceFile: chapter.sourceFileName ?? null,
    sourceVersion: chapter.sourceVersion ?? null,
    chapterKey: chapter.chapterKey,
    contentHash: chapter.contentHash ?? null,
    sourcePageFrom: chapter.sourcePageFrom ?? null,
    sourcePageTo: chapter.sourcePageTo ?? null,
  }

  for (const language of CHAPTER_LANGUAGES) {
    const title = (chapter.titles?.[language] || '').trim()
    const blocks = sanitizeBlocks(chapter.blocks?.[language] || [], mediaById)
    if (title) data[titleField(language)] = title
    if (blocks.length) data[blocksField(language)] = blocks
  }

  if (courseDocumentId) data.course = { connect: [courseDocumentId] }
  return data
}

/**
 * Every image block that carries a rendered figure blob, deduplicated by block
 * id across languages, ready to be uploaded once before the import.
 */
export function collectFigures(chapters) {
  const out = new Map()
  for (const chapter of chapters || []) {
    for (const language of CHAPTER_LANGUAGES) {
      for (const block of chapter.blocks?.[language] || []) {
        if (block.type === 'image' && block._figure?.blob && !out.has(block.id)) {
          out.set(block.id, { blob: block._figure.blob, page: block._sourcePage || 0 })
        }
      }
    }
  }
  return out
}

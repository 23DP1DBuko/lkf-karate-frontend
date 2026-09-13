import { describe, it, expect } from 'vitest'
import {
  CHAPTER_LANGUAGES,
  toPreviewChapters,
  updateChapterTitle,
  updateBlock,
  addBlock,
  removeBlock,
  moveBlock,
  copyLanguage,
  languageStats,
  blockPlainText,
  htmlToPlainText,
  plainTextToHtml,
  sanitizeBlocks,
  buildChapterImportData,
  collectFigures,
  moveBaseLanguage,
} from '../utils/chapterImportBlocks'

const parsedChapter = (overrides = {}) => ({
  title: 'KUMITE COMPETITION AREA',
  chapterKey: 'article-1',
  kind: 'article',
  order: 1,
  sourcePageFrom: 4,
  sourcePageTo: 6,
  sourceFileName: 'rules.pdf',
  sourceVersion: '2026.01',
  contentHash: 'hash-1',
  blocks: [
    { id: 'b1', type: 'text', content: '<p>1.1 The competition area…</p>' },
    { id: 'b2', type: 'table', content: { headers: ['A'], rows: [['1']], caption: '', text: 'A | 1' } },
    { id: 'b3', type: 'image', media: null, caption: 'Figure — page 4', alt: 'Figure — page 4', _figure: { blob: 'blob-3' }, _sourcePage: 4 },
  ],
  ...overrides,
})

describe('toPreviewChapters', () => {
  it('seeds the parsed content into the selected base language', () => {
    const [chapter] = toPreviewChapters([parsedChapter()], 'lv')
    expect(chapter.baseLanguage).toBe('lv')
    expect(chapter.titles.lv).toBe('KUMITE COMPETITION AREA')
    expect(chapter.blocks.lv).toHaveLength(3)
    expect(chapter.titles.ru).toBe('')
    expect(chapter.blocks.en).toEqual([])
  })

  it('falls back to lv for an unsupported language code', () => {
    const [chapter] = toPreviewChapters([parsedChapter()], 'de')
    expect(chapter.baseLanguage).toBe('lv')
    expect(chapter.blocks.lv).toHaveLength(3)
  })
})

describe('editing helpers', () => {
  const chapters = toPreviewChapters([parsedChapter()], 'lv')

  it('edits a title and marks the chapter as edited', () => {
    const next = updateChapterTitle(chapters, 0, 'lv', 'Competition area')
    expect(next[0].titles.lv).toBe('Competition area')
    expect(next[0].edited).toBe(true)
    expect(chapters[0].titles.lv).toBe('KUMITE COMPETITION AREA') // immutable
  })

  it('edits the description of an image block', () => {
    const block = chapters[0].blocks.lv[2]
    const next = updateBlock(chapters, 0, 'lv', 2, { ...block, caption: 'The tatami layout' })
    expect(next[0].blocks.lv[2].caption).toBe('The tatami layout')
    expect(next[0].blocks.lv[2].type).toBe('image')
  })

  it('edits the caption and plain text of a table block', () => {
    const block = chapters[0].blocks.lv[1]
    const next = updateBlock(chapters, 0, 'lv', 1, {
      ...block,
      content: { ...block.content, caption: 'Table 1', text: 'A | 1' },
    })
    expect(next[0].blocks.lv[1].content.caption).toBe('Table 1')
    expect(next[0].blocks.lv[1].content.text).toBe('A | 1')
  })

  it('adds, moves and removes blocks', () => {
    const withText = addBlock(chapters, 0, 'lv', 'text')
    expect(withText[0].blocks.lv).toHaveLength(4)

    const moved = moveBlock(withText, 0, 'lv', 3, -1)
    expect(moved[0].blocks.lv[2].type).toBe('text')

    const removed = removeBlock(moved, 0, 'lv', 0)
    expect(removed[0].blocks.lv).toHaveLength(3)
  })

  it('does not move a block past the edges', () => {
    const next = moveBlock(chapters, 0, 'lv', 0, -1)
    expect(next[0]).toBe(chapters[0])
    expect(next[0].edited).toBeUndefined()
  })

  it('copies a language and keeps block ids so media is shared', () => {
    const next = copyLanguage(chapters, 0, 'lv', 'ru')
    expect(next[0].titles.ru).toBe('KUMITE COMPETITION AREA')
    expect(next[0].blocks.ru.map((b) => b.id)).toEqual(['b1', 'b2', 'b3'])
  })
})

describe('text helpers', () => {
  it('round-trips a stored paragraph through the plain-text editor', () => {
    const html = '<p>B e z &amp; s h a g a</p>'
    expect(htmlToPlainText(html)).toBe('B e z & s h a g a')
    expect(plainTextToHtml('Line one\n\nLine two')).toBe('<p>Line one</p><p>Line two</p>')
  })

  it('exposes a readable preview for every block type', () => {
    expect(blockPlainText({ type: 'text', content: '<p>Hello</p>' })).toBe('Hello')
    expect(blockPlainText({ type: 'list', items: ['a', 'b'] })).toBe('a\nb')
    expect(blockPlainText({ type: 'table', content: { rows: [['a', 'b']], text: '' } })).toBe('a | b')
    expect(blockPlainText({ type: 'image', caption: 'A figure' })).toBe('A figure')
  })
})

describe('moveBaseLanguage', () => {
  it('moves the parsed content into the newly selected base language', () => {
    const chapters = toPreviewChapters([parsedChapter()], 'lv')
    const [next] = moveBaseLanguage(chapters, 'ru')
    expect(next.baseLanguage).toBe('ru')
    expect(next.titles.ru).toBe('KUMITE COMPETITION AREA')
    expect(next.blocks.ru).toHaveLength(3)
    expect(next.titles.lv).toBe('')
    expect(next.blocks.lv).toEqual([])
    expect(next.edited).toBe(true)
  })

  it('does not clobber a language that already has content', () => {
    let chapters = toPreviewChapters([parsedChapter()], 'lv')
    chapters = copyLanguage(chapters, 0, 'lv', 'ru')
    chapters = updateChapterTitle(chapters, 0, 'ru', 'Zona')
    const [next] = moveBaseLanguage(chapters, 'ru')
    expect(next.baseLanguage).toBe('ru')
    expect(next.titles.ru).toBe('Zona')
    expect(next.blocks.lv).toHaveLength(3)
  })
})

describe('languageStats', () => {
  it('reports which languages already have content', () => {
    const [chapter] = toPreviewChapters([parsedChapter()], 'lv')
    const stats = languageStats(chapter)
    expect(stats.lv.hasContent).toBe(true)
    expect(stats.lv.blocks).toBe(3)
    expect(stats.en.hasContent).toBe(false)
    expect(CHAPTER_LANGUAGES.every((l) => l in stats)).toBe(true)
  })
})

describe('sanitizeBlocks', () => {
  it('drops parser bookkeeping and attaches the uploaded media', () => {
    const [chapter] = toPreviewChapters([parsedChapter()], 'lv')
    const media = { type: 'image', file: { id: 9, url: '/uploads/figure.png' } }
    const blocks = sanitizeBlocks(chapter.blocks.lv, { b3: media })
    expect(blocks[2]._figure).toBeUndefined()
    expect(blocks[2]._sourcePage).toBeUndefined()
    expect(blocks[2].media).toEqual(media)
  })

  it('keeps a null media when the figure could not be uploaded', () => {
    const [chapter] = toPreviewChapters([parsedChapter()], 'lv')
    const blocks = sanitizeBlocks(chapter.blocks.lv, { b3: null })
    expect(blocks[2].media).toBeNull()
  })
})

describe('buildChapterImportData', () => {
  it('writes only the languages that have content', () => {
    let [chapter] = toPreviewChapters([parsedChapter()], 'lv')
    chapter = { ...chapter, titles: { ...chapter.titles, ru: 'Зона соревнований' }, blocks: { ...chapter.blocks, ru: chapter.blocks.lv.map((b) => ({ ...b })) } }

    const data = buildChapterImportData(chapter, { courseDocumentId: 'course-1' })
    expect(data.titleLv).toBe('KUMITE COMPETITION AREA')
    expect(data.blocksLv).toHaveLength(3)
    expect(data.titleRu).toBe('Зона соревнований')
    expect(data.blocksRu).toHaveLength(3)
    expect(data.titleEn).toBeUndefined()
    expect(data.blocksEn).toBeUndefined()
    expect(data.chapterKey).toBe('article-1')
    expect(data.contentHash).toBe('hash-1')
    expect(data.sourceMode).toBe('pdf')
    expect(data.course).toEqual({ connect: ['course-1'] })
  })

  it('omits the course relation when updating an existing chapter', () => {
    const [chapter] = toPreviewChapters([parsedChapter()], 'lv')
    expect(buildChapterImportData(chapter, {}).course).toBeUndefined()
  })

  it('replaces the figure blob with the uploaded media object', () => {
    const [chapter] = toPreviewChapters([parsedChapter()], 'lv')
    const data = buildChapterImportData(chapter, {
      mediaById: { b3: { type: 'image', file: { url: '/uploads/x.png' } } },
    })
    expect(data.blocksLv[2].media.file.url).toBe('/uploads/x.png')
    expect(data.blocksLv[2]._figure).toBeUndefined()
  })
})

describe('collectFigures', () => {
  it('collects each rendered figure once, even when copied across languages', () => {
    const chapters = copyLanguage(toPreviewChapters([parsedChapter()], 'lv'), 0, 'lv', 'ru')
    const figures = collectFigures(chapters)
    expect([...figures.keys()]).toEqual(['b3'])
    expect(figures.get('b3').page).toBe(4)
  })

  it('ignores image blocks without a rendered figure', () => {
    const chapters = toPreviewChapters([{
      ...parsedChapter(),
      blocks: [{ id: 'b1', type: 'image', media: null, caption: 'No blob' }],
    }], 'lv')
    expect(collectFigures(chapters).size).toBe(0)
  })
})

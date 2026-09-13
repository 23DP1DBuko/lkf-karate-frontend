import { describe, it, expect } from 'vitest'
import { collapseLetterSpacing, joinLines, groupItemsByY } from '../utils/pdfChapterParser'

const glyph = (text, x, y = 100, w = 6, h = 10) => ({ text, x, y, w, h })

describe('collapseLetterSpacing', () => {
  it('repairs the classic per-letter extraction artefact', () => {
    expect(collapseLetterSpacing('B e z   s h a g a')).toBe('Bez shaga')
  })

  it('joins letter-spaced all-caps words even with single spaces', () => {
    expect(collapseLetterSpacing('O F I C I Ā L A I S')).toBe('OFICIĀLAIS')
  })

  it('leaves normal prose untouched', () => {
    const text = 'The Referee will be standing centred between the two mats.'
    expect(collapseLetterSpacing(text)).toBe(text)
  })

  it('leaves short two-letter pairs alone (only runs of 3+ are repaired)', () => {
    expect(collapseLetterSpacing('a b')).toBe('a b')
  })

  it('handles null/undefined input', () => {
    expect(collapseLetterSpacing(null)).toBe('')
    expect(collapseLetterSpacing(undefined)).toBe('')
  })
})

describe('joinLines', () => {
  it('joins wrapped lines with a single space', () => {
    expect(joinLines(['The competition area will be a', 'matted square.']))
      .toBe('The competition area will be a matted square.')
  })

  it('does not insert a space before closing punctuation', () => {
    expect(joinLines(['Athletes', '.'])).toBe('Athletes.')
    expect(joinLines(['(see below)', ')'])).toBe('(see below))')
  })

  it('repairs words hyphenated across a line break', () => {
    expect(joinLines(['disquali-', 'fication'])).toBe('disqualification')
  })

  it('ignores blank lines and trims each part', () => {
    expect(joinLines(['  First  ', '', '   Second  '])).toBe('First Second')
  })
})

describe('groupItemsByY', () => {
  it('joins glyphs of one word without spaces and keeps real word gaps', () => {
    const rows = groupItemsByY([
      glyph('B', 10), glyph('e', 16), glyph('z', 22),
      glyph('s', 34), glyph('h', 40), glyph('a', 46), glyph('g', 52), glyph('a', 58),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].text).toBe('Bez shaga')
  })

  it('keeps separate columns of a row separated by a space', () => {
    const rows = groupItemsByY([glyph('Name', 10, 100, 30), glyph('Score', 200, 100, 30)])
    expect(rows[0].text).toBe('Name Score')
  })

  it('groups items on the same baseline and splits different ones', () => {
    const rows = groupItemsByY([glyph('one', 10, 100, 20), glyph('two', 40, 100, 20), glyph('three', 10, 80, 20)])
    expect(rows).toHaveLength(2)
    expect(rows[0].text).toBe('one two')
  })
})

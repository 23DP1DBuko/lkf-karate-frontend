import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
// espree is already installed — it is the parser ESLint itself uses in this repo,
// so the guard adds no dependency. It gives us real JSXText nodes instead of a
// regex over `>...<`, which would also match comparison operators and returns.
// Loaded through require(): espree ships as CommonJS and has no ESM default export.
const require = createRequire(import.meta.url)
const espree = require('espree')
import { ALLOWED_TOKENS, LEGACY_LITERALS } from './i18nLiteralBaseline.js'

/*
 * i18n literal guard (roadmap 2.5 / 6.5)
 *
 * Why a Vitest scan and not `react/jsx-no-literals`:
 * the ESLint rule has no way to express "this text is still hardcoded, that one
 * is not", so enabling it would either fail on every pre-existing literal or be
 * switched off file by file. This test reads the actual source, ignores numbers,
 * punctuation and the allow-listed technical tokens, and keeps a documented
 * baseline of literals that were hardcoded before the guard existed. Anything
 * new — for example re-adding a hardcoded "Start here" — fails here.
 *
 * When you localize a page, delete its entries from LEGACY_LITERALS: the second
 * test fails on entries that no longer occur, so the baseline can only shrink.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = path.resolve(here, '..')
const I18N_DIR = path.join(SRC_ROOT, 'i18n', 'locales')

function listJsxFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) listJsxFiles(full, acc)
    else if (entry.name.endsWith('.jsx')) acc.push(full)
  }
  return acc
}

const relative = (file) => path.relative(SRC_ROOT, file).split(path.sep).join('/')

/** True for text we never expect to come from i18n: digits, symbols, emoji. */
function isIgnorable(text) {
  return !/[A-Za-zĀ-žА-я]/.test(text)
}

function collectLiterals(file) {
  const source = fs.readFileSync(file, 'utf8')
  const ast = espree.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    loc: true,
  })

  const found = []
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (node.type === 'JSXText') {
      const text = node.value.replace(/\s+/g, ' ').trim()
      if (text && !isIgnorable(text)) found.push({ text, line: node.loc.start.line })
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue
      const value = node[key]
      if (value && typeof value === 'object') visit(value)
    }
  }
  visit(ast)
  return found
}

function flattenValues(node, acc = []) {
  for (const value of Object.values(node)) {
    if (typeof value === 'string') acc.push(value)
    else if (value && typeof value === 'object') flattenValues(value, acc)
  }
  return acc
}

const localeValues = new Set(
  ['lv', 'ru', 'en'].flatMap((lang) =>
    flattenValues(JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${lang}.json`), 'utf8')))
  )
)

const files = listJsxFiles(SRC_ROOT)
const found = files.map((file) => ({ file: relative(file), literals: collectLiterals(file) }))

describe('i18n literal guard', () => {
  it('has no JSX text literal that is not allow-listed', () => {
    const violations = []
    for (const { file, literals } of found) {
      for (const { text, line } of literals) {
        if (ALLOWED_TOKENS.includes(text)) continue
        if (LEGACY_LITERALS[file]?.includes(text)) continue
        violations.push(
          `${file}:${line}  "${text}"${localeValues.has(text) ? '  (this exact text already exists in the locale files — use t())' : ''}`
        )
      }
    }

    expect(
      violations,
      `Hardcoded JSX text found. Wrap it in t('some.key') and add the key to lv/ru/en.json:\n  ${violations.join('\n  ')}`
    ).toEqual([])
  })

  it('keeps the legacy baseline shrink-only', () => {
    const stale = []
    for (const [file, texts] of Object.entries(LEGACY_LITERALS)) {
      const seen = new Set(found.find((entry) => entry.file === file)?.literals.map((l) => l.text) || [])
      for (const text of texts) {
        if (!seen.has(text)) stale.push(`${file}  "${text}"`)
      }
    }
    expect(
      stale,
      `These LEGACY_LITERALS entries no longer occur — delete them from src/test/i18nLiteralBaseline.js:\n  ${stale.join('\n  ')}`
    ).toEqual([])
  })
})

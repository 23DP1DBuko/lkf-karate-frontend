import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const ROW_Y_TOLERANCE = 4
const HEADING_RE = /^(?:\d+[.\s]*)?(INTRODUCTION|ARTICLE|APPENDIX|IEVADS|NODAĻA|PIELIKUMS|ВВЕДЕНИЕ|СТАТЬЯ|ПРИЛОЖЕНИЕ|ПРИЛОЕНИЕ)(?=$|\s|:)/i
const ARTICLE_PATTERNS = [/^ARTICLE\s+(\d+)\s*:\s*(.*)$/i, /^(\d+)\.?\s*NODAĻA\s*:\s*(.*)$/i, /^СТАТЬЯ\s*(\d+)\s*:\s*(.*)$/i]
const APPENDIX_PATTERNS = [/^APPENDIX\s+(\d+)\s*:\s*(.*)$/i, /^(\d+)\.?\s*PIELIKUMS\s*:\s*(.*)$/i, /^ПРИЛО?ЕНИЕ\s*(\d+)\s*:\s*(.*)$/i]
const INTRO_PATTERNS = [/^INTRODUCTION\s*$/i, /^IEVADS\s*$/i, /^ВВЕДЕНИЕ\s*$/i]
function normalizeHeadingText(t) { return t.replace(/ПРИЛОЖЕ\s+НИЕ/gi, 'ПРИЛОЖЕНИЕ') }
function parseHeading(lineText) {
  const t = normalizeHeadingText(lineText.trim())
  if (INTRO_PATTERNS.some(re => re.test(t))) return { kind: 'introduction', number: 0, key: 'introduction' }
  for (const re of ARTICLE_PATTERNS) { const m = t.match(re); if (m) return { kind: 'article', number: +m[1], key: `article-${m[1]}` } }
  for (const re of APPENDIX_PATTERNS) { const m = t.match(re); if (m) return { kind: 'appendix', number: +m[1], key: `appendix-${m[1]}` } }
  return null
}
function isHeadingLine(line) {
  const t = line.text.trim()
  const clean = normalizeHeadingText(t.replace(/[\s_]+$/, ''))
  if (!HEADING_RE.test(clean)) return false
  if (/\.{3,}|…/.test(clean)) return false
  if (/[-–]\s*\d{1,3}\s*[-–]?$/.test(clean)) return false
  const h = parseHeading(clean)
  if (!h) return false
  if (clean.length > 120) return false
  if (h.kind === 'introduction') return INTRO_PATTERNS.some(re => re.test(clean))
  return true
}

async function check(file, pages) {
  const buf = readFileSync(resolve('ruleswkf', file))
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
  for (const p of pages) {
    const page = await pdf.getPage(p)
    const tc = await page.getTextContent()
    const rows = []
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue
      const y = it.transform[5], x = it.transform[4]
      let row = rows.find(r => Math.abs(r.y - y) <= ROW_Y_TOLERANCE)
      if (!row) { row = { y, cells: [] }; rows.push(row) }
      row.cells.push({ x, text: it.str.replace(/\s+/g, ' ').trim() })
    }
    for (const r of rows.sort((a,b) => b.y - a.y)) {
      if (r.y < 90) continue
      const joined = r.cells.sort((a,b) => a.x - b.x).map(c => c.text).join(' ')
      const line = { text: joined }
      if (joined.length < 90 && HEADING_RE.test(normalizeHeadingText(joined))) {
        const hl = isHeadingLine(line)
        console.log(`${file.split(' ')[0]} p${p} y=${r.y.toFixed(0)} hl=${hl} | ${joined.slice(0, 60)}`)
        if (!hl) {
          // why?
          console.log(`     clean=${JSON.stringify(normalizeHeadingText(joined))} h=${JSON.stringify(parseHeading(joined))}`)
        }
      }
    }
  }
}
await check('Правила соревнований по каратэ WKF 2026 ката.pdf', [26, 27, 28])
await check('Правила соревнований по каратэ WKF 2026 кумитэ.pdf', [41, 47])
process.exit(0)

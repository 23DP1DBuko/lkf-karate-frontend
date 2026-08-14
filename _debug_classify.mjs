import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

// ── copy of parser helpers ──
const ROW_Y_TOLERANCE = 4, CELL_MERGE_GAP = 25, FOOTER_BAND_Y = 90
const HEADING_RE = /^(INTRODUCTION|ARTICLE|APPENDIX|IEVADS|NODAĻA|PIELIKUMS|ВВЕДЕНИЕ|СТАТЬЯ|ПРИЛОЖЕНИЕ)\b/i
const ARTICLE_PATTERNS = [/^ARTICLE\s+(\d+)\s*:?\s*(.*)$/i, /^(\d+)\.?\s*NODAĻA\s*:?\s*(.*)$/i, /^СТАТЬЯ\s+(\d+)\s*:?\s*(.*)$/i]
const APPENDIX_PATTERNS = [/^APPENDIX\s+(\d+)\s*:?\s*(.*)$/i, /^(\d+)\.?\s*PIELIKUMS\s*:?\s*(.*)$/i, /^ПРИЛОЖЕНИЕ\s+(\d+)\s*:?\s*(.*)$/i]
const INTRO_PATTERNS = [/^INTRODUCTION\s*$/i, /^IEVADS\s*$/i, /^ВВЕДЕНИЕ\s*$/i]
function parseHeading(t) {
  if (INTRO_PATTERNS.some(re => re.test(t))) return { kind: 'introduction', number: 0, key: 'introduction', order: 0 }
  for (const re of ARTICLE_PATTERNS) { const m = t.match(re); if (m) return { kind: 'article', number: +m[1], title: (m[2]||'').trim(), key: `article-${m[1]}`, order: +m[1] } }
  for (const re of APPENDIX_PATTERNS) { const m = t.match(re); if (m) return { kind: 'appendix', number: +m[1], title: (m[2]||'').trim(), key: `appendix-${m[1]}`, order: 100 + +m[1] } }
  return null
}
function isHeadingLine(line) {
  const t = line.text.trim()
  if (!HEADING_RE.test(t)) return false
  if (/\.{3,}|…/.test(t)) return false
  if (/[-–]\s*\d{1,3}\s*[-–]?$/.test(t)) return false
  const h = parseHeading(t)
  if (!h) return false
  if (t.length > 120) return false
  if (h.kind === 'introduction') return INTRO_PATTERNS.some(re => re.test(t))
  return true
}
function groupItemsByY(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows = []
  for (const it of sorted) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(last.y - it.y) <= ROW_Y_TOLERANCE) last.cells.push({ x: it.x, w: it.w, text: it.text })
    else rows.push({ y: it.y, cells: [{ x: it.x, w: it.w, text: it.text }] })
  }
  for (const r of rows) {
    r.cells.sort((a, b) => a.x - b.x)
    const merged = []
    for (const c of r.cells) {
      const prev = merged[merged.length - 1]
      if (prev && c.x - (prev.x + prev.w) < CELL_MERGE_GAP) { prev.text += ' ' + c.text; prev.w = Math.max(prev.w, c.x + c.w - prev.x) }
      else merged.push({ ...c })
    }
    r.cells = merged; r.text = merged.map(c => c.text).join(' ')
  }
  return rows
}
function pageLines(items, pageIndex) {
  const rows = groupItemsByY(items)
  const lines = []
  for (const row of rows) {
    if (row.y < FOOTER_BAND_Y) continue
    if (row.cells.length === 1 && row.cells[0].x > 470 && /^\d{1,3}$/.test(row.cells[0].text.trim())) continue
    lines.push({ y: row.y, x: row.cells[0]?.x ?? 0, text: row.text.trim(), cells: row.cells, pageIndex })
  }
  return lines.sort((a, b) => b.y - a.y)
}
function isTocPage(page) {
  let numberedDotRows = 0, rightNumbers = 0, dashedRightNumbers = 0
  const yRows = groupItemsByY(page.items)
  for (const row of yRows) {
    const joined = row.cells.map(c => c.text).join(' ')
    if (joined.includes('…') || /\.{3,}/.test(joined)) { if (/\b\d{1,3}\s*$/.test(joined.trim())) numberedDotRows++ }
    const last = row.cells[row.cells.length - 1]
    if (last && last.x > 450) {
      const lt = last.text.trim()
      if (/^\d{1,3}$/.test(lt)) rightNumbers++
      else if (/^-\s*\d{1,3}\s*-$/.test(lt)) dashedRightNumbers++
    }
  }
  const hasContentHeading = page.lines.some(l => /^content$/i.test(l.text.trim()))
  return numberedDotRows >= 4 || rightNumbers >= 6 || dashedRightNumbers >= 4 || (hasContentHeading && (rightNumbers >= 3 || dashedRightNumbers >= 3))
}

async function classify(file) {
  const buf = readFileSync(resolve('ruleswkf', file))
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
  console.log(`\n===== ${file}`)
  for (let p = 1; p <= Math.min(pdf.numPages, 12); p++) {
    const page = await pdf.getPage(p)
    const tc = await page.getTextContent()
    const items = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ x: it.transform[4], y: it.transform[5], w: it.width, text: it.str.replace(/\s+/g, ' ').trim() }))
    const meta = { items, lines: pageLines(items, p - 1) }
    const toc = isTocPage(meta)
    const heads = meta.lines.filter(isHeadingLine).map(l => l.text.slice(0, 50))
    console.log(`p${p} toc=${toc} heads=[${heads.join(' | ') || '-'}]`)
  }
}
await classify('Правила соревнований по каратэ WKF 2026 ката.pdf')
await classify('LAT_WKF_Kata_Competition_Rules_2026.pdf')
await classify('WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf')
process.exit(0)

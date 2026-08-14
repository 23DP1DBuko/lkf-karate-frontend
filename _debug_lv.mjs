import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const buf = readFileSync(resolve('ruleswkf', 'LAT_WKF_Kata_Competition_Rules_2026.pdf'))
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
const ROW_Y_TOLERANCE = 4
for (let p = 12; p <= 23; p++) {
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
    if (/^\d+\.\s*NODAĻA|PIELIKUMS|NODAĻA/i.test(joined) || /VĒRTĒŠANA|CĪŅU NORISE|OFICIĀLAIS|P ROTEST|PROTEST|PIELIK/i.test(joined)) {
      console.log(`p${p} y=${r.y.toFixed(0)} | ${joined.slice(0, 80)}`)
    }
  }
}
process.exit(0)

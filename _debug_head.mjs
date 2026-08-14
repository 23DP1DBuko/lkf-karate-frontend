import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

async function linesOf(file, pages) {
  const buf = readFileSync(resolve('ruleswkf', file))
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
  for (const p of pages) {
    const page = await pdf.getPage(p)
    const tc = await page.getTextContent()
    // group by y like the parser
    const rows = []
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue
      const y = it.transform[5], x = it.transform[4]
      let row = rows.find(r => Math.abs(r.y - y) <= 4)
      if (!row) { row = { y, cells: [] }; rows.push(row) }
      row.cells.push({ x, text: it.str.replace(/\s+/g, ' ').trim() })
    }
    console.log(`--- ${file} page ${p} ---`)
    for (const r of rows.sort((a,b) => b.y - a.y)) {
      if (r.y < 90) continue
      const joined = r.cells.sort((a,b) => a.x - b.x).map(c => c.text).join(' ')
      console.log(`y=${r.y} | ${joined.slice(0, 110)}`)
    }
  }
}
await linesOf('Правила соревнований по каратэ WKF 2026 ката.pdf', [3])
await linesOf('LAT_WKF_Kata_Competition_Rules_2026.pdf', [3])
process.exit(0)

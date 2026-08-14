import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const buf = readFileSync(resolve('ruleswkf/ENG_LAT_RUS_Kumite_Questions_07_2026.pdf'))
const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), disableFontFace: true }).promise
// check last 3 pages for answers key
for (let p = pdf.numPages - 2; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p)
  const tc = await page.getTextContent()
  const text = tc.items.map(it => it.str).join(' ')
  console.log(`--- page ${p} (${text.length}) ---`)
  console.log(text.slice(0, 800))
}
// count questions on page 2 (first Q page)
const page2 = await pdf.getPage(2)
const tc2 = await page2.getTextContent()
const t2 = tc2.items.map(it => it.str).join('\n')
const nums = t2.match(/\b\d{1,3}\b/g)
console.log('\nPAGE2 sample tokens:', t2.slice(0, 300))
process.exit(0)

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const dir = resolve('ruleswkf')
const buf = readFileSync(resolve(dir, 'Правила соревнований по каратэ WKF 2026 ката.pdf'))
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
const page = await pdf.getPage(3)
const tc = await page.getTextContent()
for (const it of tc.items) {
  if (it.str && it.str.trim()) {
    console.log(`${it.transform[4].toFixed(0).padStart(4)}|${it.transform[5].toFixed(0).padStart(4)}|${it.str}`)
  }
}
process.exit(0)

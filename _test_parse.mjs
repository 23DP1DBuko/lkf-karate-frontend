import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseChapterPdf } from './src/utils/pdfChapterParser.js'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const dir = resolve('ruleswkf')
const files = ['WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf','WKF 2026 Kumite Competition Rules MASTER COPY_V9.pdf','LAT_WKF_Kata_Competition_Rules_2026.pdf','Правила соревнований по каратэ WKF 2026 ката.pdf','Правила соревнований по каратэ WKF 2026 кумитэ.pdf']
for (const f of files) {
  try {
    const buf = readFileSync(resolve(dir, f))
    const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    const res = await parseChapterPdf(pdfjsLib, u8, {})
    console.log(`OK ${f} -> ${res.chapters.length} chapters | ver:${res.sourceVersion}`)
    console.log('   keys:', res.chapters.map(c=>c.chapterKey).join(','))
  } catch (e) {
    console.log(`FAIL ${f} -> ${e.message.slice(0,150)}`)
  }
}
process.exit(0)

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseChapterPdf } from './src/utils/pdfChapterParser.js'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

async function run(file) {
  const buf = readFileSync(resolve('ruleswkf', file))
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  try {
    const res = await parseChapterPdf(pdfjsLib, u8, {})
    console.log(`\nOK ${file} -> ${res.chapters.length}`)
    for (const c of res.chapters) console.log(`  ${c.chapterKey.padEnd(14)} p${c.sourcePageFrom}-${c.sourcePageTo} | ${(c.title||'').slice(0,60)}`)
  } catch (e) {
    console.log(`\nFAIL ${file} -> ${e.message.slice(0, 120)}`)
  }
}
await run('WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf')
await run('Правила соревнований по каратэ WKF 2026 ката.pdf')
await run('LAT_WKF_Kata_Competition_Rules_2026.pdf')
await run('Правила соревнований по каратэ WKF 2026 кумитэ.pdf')
process.exit(0)

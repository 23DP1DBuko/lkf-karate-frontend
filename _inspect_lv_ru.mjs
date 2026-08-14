import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const dir = resolve('ruleswkf')

async function dump(file, pages) {
  const buf = readFileSync(resolve(dir, file))
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
  console.log(`\n===== ${file}`)
  for (const p of pages) {
    const page = await pdf.getPage(p)
    const tc = await page.getTextContent()
    console.log(`--- page ${p} items (x|y|text) ---`)
    for (const it of tc.items) {
      if (it.str && it.str.trim()) {
        console.log(`${it.transform[4].toFixed(0).padStart(4)}|${it.transform[5].toFixed(0).padStart(4)}|${it.str}`)
      }
    }
  }
}

await dump('LAT_WKF_Kata_Competition_Rules_2026.pdf', [2, 3])
await dump('Правила соревнований по каратэ WKF 2026 ката.pdf', [2, 3])
process.exit(0)

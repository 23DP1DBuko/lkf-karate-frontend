import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

async function inspect(file, pageNos) {
  const buf = readFileSync(resolve('ruleswkf', file))
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
  for (const p of pageNos) {
    const page = await pdf.getPage(p)
    const ops = await page.getOperatorList()
    let paintImages = 0, constructPaths = 0, rects = 0
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i]
      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject || fn === pdfjsLib.OPS.paintImageMaskXObject) paintImages++
      if (fn === pdfjsLib.OPS.constructPath) constructPaths++
      if (fn === pdfjsLib.OPS.rectangle || fn === pdfjsLib.OPS.rectangleFill) rects++
    }
    console.log(`${file.slice(0, 40)} p${p}: paintImages=${paintImages} constructPath=${constructPaths} rects=${rects}`)
  }
}
await inspect('WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf', [3, 4, 5])
await inspect('Правила соревнований по каратэ WKF 2026 ката.pdf', [3, 4, 5])
process.exit(0)

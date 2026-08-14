import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const buf = readFileSync(resolve('ruleswkf', 'WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf'))
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
const page = await pdf.getPage(3)
const ops = await page.getOperatorList()
for (let i = 0; i < ops.fnArray.length; i++) {
  const fn = ops.fnArray[i]
  if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject || fn === pdfjsLib.OPS.paintImageMaskXObject) {
    console.log('fn', fn, 'args:', JSON.stringify(ops.argsArray[i]))
  }
}
console.log('OPS codes:', { paintImageXObject: pdfjsLib.OPS.paintImageXObject, paintInlineImageXObject: pdfjsLib.OPS.paintInlineImageXObject, paintImageMaskXObject: pdfjsLib.OPS.paintImageMaskXObject })
process.exit(0)

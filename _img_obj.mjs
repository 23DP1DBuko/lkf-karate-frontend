import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const buf = readFileSync(resolve('ruleswkf', 'WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf'))
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
const page = await pdf.getPage(3)
const ops = await page.getOperatorList()
// find paintImageXObject
for (let i = 0; i < ops.fnArray.length; i++) {
  if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
    const name = ops.argsArray[i][0]
    const img = await page.objs.get(name)
    console.log('name:', name, '| img props:', img ? JSON.stringify({ w: img.w, h: img.h, width: img.width, height: img.height, kind: img.kind, hasData: !!img.data }) : 'NULL')
  }
}
process.exit(0)

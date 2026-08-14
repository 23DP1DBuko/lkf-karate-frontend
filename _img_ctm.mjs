import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const buf = readFileSync(resolve('ruleswkf', 'WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf'))
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
const page = await pdf.getPage(3)
const ops = await page.getOperatorList()
// track CTM through the op list
let ctm = [1, 0, 0, 1, 0, 0]
const mul = (m, t) => [
  m[0]*t[0] + m[2]*t[1], m[1]*t[0] + m[3]*t[1],
  m[0]*t[2] + m[2]*t[3], m[1]*t[2] + m[3]*t[3],
  m[0]*t[4] + m[2]*t[5] + m[4], m[1]*t[4] + m[3]*t[5] + m[5],
]
for (let i = 0; i < ops.fnArray.length; i++) {
  const fn = ops.fnArray[i]
  const args = ops.argsArray[i]
  if (fn === pdfjsLib.OPS.transform) { ctm = mul(ctm, args); continue }
  if (fn === pdfjsLib.OPS.restore) { ctm = [1,0,0,1,0,0] ; continue } // rough
  if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
    const name = args[0]
    const img = await page.objs.get(name)
    const w = img?.width || 0, h = img?.height || 0
    // image drawn in a unit box scaled by CTM
    const x0 = ctm[4], y0 = ctm[5]
    const x1 = ctm[0]*w + ctm[2]*h + ctm[4]
    const y1 = ctm[1]*w + ctm[3]*h + ctm[5]
    console.log('image', name, 'ctm:', ctm.map(v=>v.toFixed(2)).join(','), 'box: x', Math.min(x0,x1).toFixed(0), 'y', Math.min(y0,y1).toFixed(0), 'w', Math.abs(x1-x0).toFixed(0), 'h', Math.abs(y1-y0).toFixed(0))
  }
}
process.exit(0)

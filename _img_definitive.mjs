import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const canvasFactory = {
  create(w, h) { const c = createCanvas(w, h); return { canvas: c, context: c.getContext('2d') } },
  reset(ctx, w, h) { ctx.canvas.width = w; ctx.canvas.height = h },
  destroy() {},
}
const buf = readFileSync(resolve('ruleswkf', 'WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf'))
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true, canvasFactory }).promise
const page = await pdf.getPage(3)
const vp = page.getViewport({ scale: 2 })
const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height))
const ctx = canvas.getContext('2d')
await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise

// candidate region in page pt: x 156..438, y(pdf) 116..398  ->  screen y 444..726 at scale1
const S = 2
const px = Math.round(156*S), py = Math.round((vp.height/2 - 398)*S)
const pw = Math.round((438-156)*S), ph = Math.round((398-116)*S)
console.log('crop px py pw ph', px, py, pw, ph, '| page', canvas.width, canvas.height)
const data = ctx.getImageData(px, py, pw, ph).data
let nonWhite = 0, colors = new Set(), total = pw*ph
for (let i = 0; i < data.length; i += 4) {
  const r=data[i], g=data[i+1], b=data[i+2]
  if (r<245 || g<245 || b<245) nonWhite++
  if (i % 40 === 0) colors.add(`${r>>4},${g>>4},${b>>4}`)
}
console.log('crop nonWhite ratio:', (nonWhite/total).toFixed(3), 'unique color buckets:', colors.size)
// control region: a known text-only strip, e.g. page top left body text area x 80..500 y(pdf) 700..730
const cx = Math.round(80*S), cy = Math.round((vp.height/2 - 730)*S)
const cw = Math.round(420*S), ch = Math.round(30*S)
const cdata = ctx.getImageData(cx, cy, cw, ch).data
let cNonWhite = 0
for (let i = 0; i < cdata.length; i += 4) { if (cdata[i]<245||cdata[i+1]<245||cdata[i+2]<245) cNonWhite++ }
console.log('text-control nonWhite ratio:', (cNonWhite/(cw*ch)).toFixed(3))
// also raw args + obj dims
const ops = await page.getOperatorList()
for (let i = 0; i < ops.fnArray.length; i++) {
  if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
    const name = ops.argsArray[i][0]
    const img = await page.objs.get(name)
    console.log('paintImageXObject args:', JSON.stringify(ops.argsArray[i]), '| obj w h:', img && img.w, img && img.h, '| kind:', img && img.kind)
  }
}
process.exit(0)

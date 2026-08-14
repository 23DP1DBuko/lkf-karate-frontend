import { readFileSync } from 'node:fs'
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
const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1
for (let y = 0; y < canvas.height; y += 2) {
  for (let x = 0; x < canvas.width; x += 2) {
    const i = (y * canvas.width + x) * 4
    if (data[i] < 240 || data[i+1] < 240 || data[i+2] < 240) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
console.log('page:', canvas.width, 'x', canvas.height)
console.log('ink px:', minX, minY, '→', maxX, maxY, '=', maxX-minX, 'x', maxY-minY)
process.exit(0)

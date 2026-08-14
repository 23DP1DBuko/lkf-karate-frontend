import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
const buf = readFileSync(resolve('ruleswkf', 'WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf'))
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
const page = await pdf.getPage(3)
const vp = page.getViewport({ scale: 2 })
const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height))
const ctx = canvas.getContext('2d')
await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
// find non-white bbox (allow near-white)
let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1
for (let y = 0; y < canvas.height; y += 2) {
  for (let x = 0; x < canvas.width; x += 2) {
    const i = (y * canvas.width + x) * 4
    const r = data[i], g = data[i+1], b = data[i+2]
    if (r < 240 || g < 240 || b < 240) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
console.log('page size:', canvas.width, 'x', canvas.height)
console.log('ink bbox px:', minX, minY, '→', maxX, maxY, '=', maxX-minX, 'x', maxY-minY)
// convert to PDF coords (scale 2, y bottom-up)
const pdfX = minX / 2, pdfX2 = maxX / 2, pdfY = canvas.height/2 - maxY/2, pdfY2 = canvas.height/2 - minY/2
console.log('pdf bbox:', pdfX.toFixed(0), pdfY.toFixed(0), '→', pdfX2.toFixed(0), pdfY2.toFixed(0))
process.exit(0)

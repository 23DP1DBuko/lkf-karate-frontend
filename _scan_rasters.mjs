import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

// inline copy of getRasterImages (parser-local helper)
function getRasterImages(ops, OPS) {
  const images = []
  let ctm = [1, 0, 0, 1, 0, 0]
  const stack = []
  const mul = (m, t) => [
    m[0] * t[0] + m[2] * t[1], m[1] * t[0] + m[3] * t[1],
    m[0] * t[2] + m[2] * t[3], m[1] * t[2] + m[3] * t[3],
    m[0] * t[4] + m[2] * t[5] + m[4], m[1] * t[4] + m[3] * t[5] + m[5],
  ]
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]
    const a = ops.argsArray[i]
    if (fn === OPS.transform && a?.length >= 6 && typeof a[0] === 'number') {
      ctm = mul(ctm, a)
    } else if (fn === OPS.save) {
      stack.push(ctm)
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || ctm
    } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject ||
      fn === OPS.paintImageMaskXObject || fn === OPS.paintJpegXObject) {
      const w = Math.abs(ctm[0]) + Math.abs(ctm[2])
      const h = Math.abs(ctm[1]) + Math.abs(ctm[3])
      if (w > 0 && h > 0 && isFinite(w) && isFinite(h)) {
        images.push({ x: ctm[4], y: ctm[5], w, h })
      }
    }
  }
  return images
}
const dir = resolve('ruleswkf')
const files = [
  'WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf',
  'LAT_WKF_Kata_Competition_Rules_2026.pdf',
  'Правила соревнований по каратэ WKF 2026 ката.pdf',
  'WKF 2026 Kumite Competition Rules MASTER COPY_V9.pdf',
  'Правила соревнований по каратэ WKF 2026 кумитэ.pdf',
]

for (const f of files) {
  const buf = readFileSync(resolve(dir, f))
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const pdf = await pdfjsLib.getDocument({ data: u8, disableFontFace: true }).promise
  let kept = 0
  const keptInfo = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const vp = page.getViewport({ scale: 1 })
    const pageArea = vp.width * vp.height
    let ops
    try { ops = await page.getOperatorList() } catch { continue }
    for (const img of getRasterImages(ops, pdfjsLib.OPS)) {
      const big = img.w >= 40 || img.h >= 40
      const notFrame = img.w * img.h < 0.55 * pageArea
      const notFooter = img.y > 90
      if (big && notFrame && notFooter) {
        kept++
        keptInfo.push(`    p${p}: x=${img.x.toFixed(0)} y=${img.y.toFixed(0)} w=${img.w.toFixed(0)} h=${img.h.toFixed(0)} (pageH=${vp.height.toFixed(0)})`)
      }
    }
  }
  console.log(`\n${f}`)
  console.log(`  kept raster figures: ${kept}`)
  console.log(keptInfo.slice(0, 40).join('\n'))
  if (keptInfo.length > 40) console.log(`  ... and ${keptInfo.length - 40} more`)
}
process.exit(0)

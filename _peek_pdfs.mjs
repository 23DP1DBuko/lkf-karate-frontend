// Dump first pages of each ruleswkf PDF to understand structure
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = resolve(__dirname, 'ruleswkf')

async function main() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const files = readdirSync(dir).filter(f => f.endsWith('.pdf'))

  for (const f of files) {
    const buf = readFileSync(resolve(dir, f))
    try {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
        disableFontFace: true,
      }).promise
      console.log(`\n########## ${f} | pages: ${pdf.numPages}`)
      const pagesToShow = Math.min(3, pdf.numPages)
      for (let p = 1; p <= pagesToShow; p++) {
        const page = await pdf.getPage(p)
        const tc = await page.getTextContent()
        const text = tc.items.map(it => it.str).join(' ')
        console.log(`--- page ${p} (${text.length} chars) ---`)
        console.log(text.slice(0, 700))
      }
    } catch (e) {
      console.log(`\n########## ${f} | ERROR: ${e.message}`)
    }
  }
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })

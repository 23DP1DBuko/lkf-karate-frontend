#!/usr/bin/env node
/**
 * import-wkf-rules.mjs — one-shot import of the WKF 2026 rule books from
 * frontend/ruleswkf/ into the Strapi backend.
 *
 * Behavior:
 *  - Ensures a "Kumite" course exists (Kata already exists in this DB).
 *  - Parses each rules PDF (EN/LV/RU) with the shared pdfChapterParser,
 *    rendering figures through @napi-rs/canvas (Node), uploading them to the
 *    media library, and building the same block structure the admin UI uses.
 *  - Merges translations into ONE chapter set per course keyed by chapterKey
 *    (introduction / article-N / appendix-N): EN fills blocksEn/titleEn,
 *    LV fills blocksLv/titleLv, RU fills blocksRu/titleRu.
 *  - Chapters are created/updated as PUBLISHED (like AdminChaptersImport).
 *
 * Usage:
 *   cd frontend && node scripts/import-wkf-rules.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseChapterPdf, chapterContentHash } from '../src/utils/pdfChapterParser.js'
import { createCanvas } from '@napi-rs/canvas'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RULES_DIR = resolve(__dirname, '../ruleswkf')

const API = process.env.API_URL || 'http://localhost:1337/api'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123'

// Which PDF → which course, and which language block it fills.
// Order matters: EN first (creates chapters), then LV, then RU (merge).
const IMPORTS = [
  { file: 'WKF Kata Competition Rules 2026 MASTER COPY_V2.pdf', course: 'kata', lang: 'en' },
  { file: 'LAT_WKF_Kata_Competition_Rules_2026.pdf', course: 'kata', lang: 'lv' },
  { file: 'Правила соревнований по каратэ WKF 2026 ката.pdf', course: 'kata', lang: 'ru' },
  { file: 'WKF 2026 Kumite Competition Rules MASTER COPY_V9.pdf', course: 'kumite', lang: 'en' },
  { file: 'Правила соревнований по каратэ WKF 2026 кумитэ.pdf', course: 'kumite', lang: 'ru' },
]

const KUMITE_COURSE = {
  titleLv: 'Kumite',
  titleRu: 'Кумитэ',
  titleEn: 'Kumite',
  descriptionLv: 'Kumite ir brīvā cīņa jeb sparinga forma karatē. Šis kurss aptver kumite noteikumus, punktu skaitīšanas sistēmu, tiesnešu signālus un stratēģijas vērtēšanai.',
  descriptionRu: 'Кумитэ — это форма свободного боя или спарринга в каратэ. Этот курс охватывает правила кумитэ, систему подсчёта очков, сигналы судей и стратегии судейства.',
  descriptionEn: 'Kumite is the free fighting or sparring form of karate. This course covers kumite rules, point scoring system, referee signals, and judging strategies.',
  category: 'kumite',
  slug: 'kumite',
}

const CAP = { en: 'En', lv: 'Lv', ru: 'Ru' }

// ─── tiny HTTP helpers ────────────────────────────────────────────────────────

let jwt = ''
async function api(method, path, body = undefined) {
  const headers = {}
  if (jwt) headers.Authorization = `Bearer ${jwt}`
  const opts = { method, headers }
  if (body instanceof FormData) {
    opts.body = body // multipart – let fetch set the boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(`${API}${path}`, opts)
  const text = await res.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${parsed?.error?.message || text.slice(0, 300)}`)
  }
  return parsed
}

async function login() {
  const res = await api('POST', '/auth/local', { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  jwt = res.jwt
  console.log(`✅ Admin login OK (${ADMIN_EMAIL})`)
}

async function ensureCourse() {
  const existing = await api('GET', `/courses?filters[slug][$eq]=kumite&pagination[pageSize]=1`)
  if (existing.data?.length) {
    const c = existing.data[0]
    console.log(`✅ Kumite course already exists (${c.documentId})`)
    return c.documentId
  }
  const created = await api('POST', '/courses?status=published', {
    data: { ...KUMITE_COURSE, publishedAt: new Date().toISOString() },
  })
  const c = created.data
  console.log(`✅ Kumite course created (${c.documentId})`)
  return c.documentId
}

async function getCourseBySlug(slug) {
  const res = await api('GET', `/courses?filters[slug][$eq]=${slug}&pagination[pageSize]=1`)
  if (!res.data?.length) throw new Error(`Course "${slug}" not found — run backend/scripts/seed-courses.js first`)
  return res.data[0].documentId
}

/**
 * The Kata course in this DB is polluted: it holds the OLD kumite rule
 * chapters (sourceFile = wkfrules.pdf) whose chapterKeys (article-1 …
 * appendix-6) collide with the new kata rule keys. Delete them first so the
 * kata import starts from a clean slate.
 */
async function cleanupMisplacedChapters() {
  const kataCourseId = await getCourseBySlug('kata')
  const qs = `filters[course][documentId][$eq]=${kataCourseId}&pagination[page]=1&pagination[pageSize]=200`
  const [pub, draft] = await Promise.all([
    api('GET', `/chapters?status=published&${qs}`),
    api('GET', `/chapters?status=draft&${qs}`),
  ])
  const rows = [...(pub.data || []), ...(draft.data || [])]
  const misplaced = rows.filter(c => (c.sourceFile || '').toLowerCase().includes('wkfrules'))
  const seen = new Set()
  let deleted = 0
  for (const c of misplaced) {
    if (seen.has(c.documentId)) continue // draft+published copies share a documentId
    seen.add(c.documentId)
    try {
      await api('DELETE', `/chapters/${c.documentId}`)
      deleted++
    } catch (err) {
      console.log(`   ⚠ could not delete ${c.documentId} (${c.chapterKey}): ${err.message}`)
    }
  }
  console.log(`🧹 Removed ${deleted} misplaced kumite chapter(s) from the Kata course`)
  return deleted
}

// ─── figure rendering (Node) ─────────────────────────────────────────────────

const pageCanvasCache = new Map()

async function nodeFigureRenderer(page, fig) {
  const pageNum = page.pageNumber
  let canvas = pageCanvasCache.get(pageNum)
  if (!canvas) {
    const scale = 2
    const viewport = page.getViewport({ scale })
    canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    pageCanvasCache.set(pageNum, canvas)
  }
  const scale = 2
  const sx = Math.max(0, fig.x * scale)
  const sy = canvas.height - (fig.y + fig.h) * scale // PDF y is bottom-up
  const sw = Math.min(canvas.width - sx, fig.w * scale)
  const sh = Math.min(canvas.height - sy, fig.h * scale)
  if (sw < 4 || sh < 4) return null
  const out = createCanvas(Math.round(sw), Math.round(sh))
  out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height)
  return out.toBuffer('image/png')
}

async function uploadFigure(buffer, pageNo) {
  const form = new FormData()
  form.append('files', new Blob([buffer], { type: 'image/png' }), `figure-page-${pageNo}.png`)
  const res = await api('POST', '/upload', form)
  return res[0] || null
}

// ─── chapter upsert ──────────────────────────────────────────────────────────

async function existingChaptersForCourse(courseDocumentId) {
  const qs = `filters[course][documentId][$eq]=${courseDocumentId}&fields[0]=documentId&fields[1]=chapterKey&fields[2]=contentHash&pagination[page]=1&pagination[pageSize]=200`
  const [pub, draft] = await Promise.all([
    api('GET', `/chapters?status=published&${qs}`),
    api('GET', `/chapters?status=draft&${qs}`),
  ])
  const byKey = new Map()
  for (const e of [...(pub.data || []), ...(draft.data || [])]) {
    if (!byKey.has(e.chapterKey)) byKey.set(e.chapterKey, e)
  }
  return byKey
}

function stripInternal(block) {
  const { _figure, _sourcePage, ...rest } = block
  return rest
}

async function processPdf({ file, course, lang }) {
  const filePath = resolve(RULES_DIR, file)
  const buf = readFileSync(filePath)
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const result = await parseChapterPdf(pdfjsLib, u8, {
    renderFigure: nodeFigureRenderer,
    onProgress: () => {},
  })

  const courseDocumentId = await getCourseBySlug(course)
  const existing = await existingChaptersForCourse(courseDocumentId)

  const suffix = CAP[lang]
  const titleKey = `title${suffix}`
  const blocksKey = `blocks${suffix}`

  let created = 0
  let updated = 0
  let skipped = 0
  const failed = []

  for (const ch of result.chapters) {
    try {
      const hash = chapterContentHash(ch)
      const match = existing.get(ch.chapterKey)

      if (match && match.contentHash === hash && lang === 'en') {
        // identical EN re-import – skip (mirrors the admin UI)
        skipped++
        continue
      }

      // upload figures
      const blocks = []
      for (const b of ch.blocks) {
        if (b.type === 'image' && b._figure?.blob) {
          const fileObj = await uploadFigure(b._figure.blob, b._sourcePage || 0)
          blocks.push({ ...stripInternal(b), media: fileObj ? { type: 'image', file: fileObj } : null })
        } else {
          blocks.push(stripInternal(b))
        }
      }

      const data = {
        [titleKey]: ch.title.trim() || ch.title,
        [blocksKey]: blocks,
        order: ch.order,
        sourceMode: 'pdf',
        sourceFile: file,
        sourceVersion: result.sourceVersion || null,
        chapterKey: ch.chapterKey,
        contentHash: hash,
        sourcePageFrom: ch.sourcePageFrom,
        sourcePageTo: ch.sourcePageTo,
      }

      if (!match) {
        // create with the EN master as the base language
        await api('POST', '/chapters?status=published', {
          data: {
            ...data,
            baseLanguage: 'en', // base tab = master copy
            course: { connect: [courseDocumentId] },
          },
        })
        created++
      } else {
        await api('PUT', `/chapters/${match.documentId}?status=published`, { data })
        updated++
      }
    } catch (err) {
      failed.push({ key: ch.chapterKey, error: err.message })
    }
  }

  console.log(`📄 ${file} → ${course}/${lang}: created=${created} updated=${updated} skipped=${skipped} failed=${failed.length}`)
  for (const f of failed) console.log(`   ✗ ${f.key}: ${f.error}`)
  return { created, updated, skipped, failed, total: result.chapters.length, sourceVersion: result.sourceVersion }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  await login()
  await ensureCourse()
  await cleanupMisplacedChapters()

  const summary = {}
  for (const imp of IMPORTS) {
    summary[imp.file] = await processPdf(imp)
  }

  console.log('\n────────────── SUMMARY ──────────────')
  for (const [file, s] of Object.entries(summary)) {
    console.log(`${file.slice(0, 55).padEnd(57)} ${s.total} chapters | +${s.created} ~${s.updated} =${s.skipped} ✗${s.failed.length} | ver ${s.sourceVersion || '-'}`)
  }
  console.log('\nDone. Run: node _inspect_state.js (backend) to verify.')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})

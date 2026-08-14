// pdfChapterParser.js
// ---------------------------------------------------------------------------
// Parses a rules-style PDF into chapters with structured blocks.
//
// Features:
//  - Skips the table of contents (dot-leader / right-aligned page numbers)
//  - Detects real sections: INTRODUCTION / ARTICLE N : TITLE / APPENDIX N : TITLE
//  - Extracts text paragraphs, lists, tables (grid detection) and figures
//    (vector drawings rendered via an injectable renderer)
//  - Computes a deterministic content hash + chapterKey for deduplication
//
// Runs in both the browser (pdfjs-dist default build) and Node
// (pdfjs-dist legacy build). Image rendering is injected by the caller so
// the core logic stays environment-agnostic.
// ---------------------------------------------------------------------------

const FOOTER_BAND_Y = 90        // PDF y < 90 → running footer (skip)
const CELL_MERGE_GAP = 25       // items closer than this (pt) belong to the same cell
const ROW_Y_TOLERANCE = 4       // y tolerance for grouping items into a row
const MIN_TABLE_ROWS = 3        // minimum rows for a table
const MIN_TABLE_COL_SPAN = 100  // min x-span between first & last column
const MIN_FIGURE_SIZE = 40      // drawings smaller than this are noise
const FRAME_AREA_RATIO = 0.55   // path covering >55% of the page is a frame/border
const FIGURE_CLUSTER_GAP = 12   // merge paths closer than this (pt)

// cyrb53 – fast deterministic hash (pure JS, works in browser + node)
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

function normalizeForHash(blocks) {
  const parts = blocks.map(b => {
    if (b.type === 'table') {
      const c = b.content || {}
      return JSON.stringify([c.headers || [], c.rows || [], c.caption || ''])
    }
    if (b.type === 'list') return JSON.stringify(b.items || [])
    if (b.type === 'image') return `image:${b.caption || ''}`
    return String(b.content || '')
  })
  return parts
    .join('\n')
    .replace(/<[^>]+>/g, ' ') // strip HTML
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function uid() {
  return (globalThis.crypto && globalThis.crypto.randomUUID)
    ? globalThis.crypto.randomUUID()
    : `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

// ─── Drawing path extraction ────────────────────────────────────────────────

function getDrawingPaths(ops, OPS) {
  // Each constructPath/rectangle becomes one path box.
  // constructPath args: [opsArr, argsArr, [minX, maxX, minY, maxY]]
  const paths = []
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]
    let box = null
    if (fn === OPS.constructPath) {
      const m = ops.argsArray[i]?.[2]
      if (Array.isArray(m) && m.length === 4 && typeof m[0] === 'number') {
        box = { x: m[0], y: m[2], w: m[1] - m[0], h: m[3] - m[2] }
      }
    } else if (fn === OPS.rectangle || fn === OPS.rectangleFill) {
      const a = ops.argsArray[i]
      if (a?.length >= 4 && typeof a[0] === 'number') {
        box = { x: a[0], y: a[1], w: a[2], h: a[3] }
      }
    }
    if (box && box.w > 0 && box.h > 0 && isFinite(box.w) && isFinite(box.h)) {
      paths.push(box)
    }
  }
  return paths
}

function boxesOverlapExpanded(a, b, gap) {
  return a.x - gap < b.x + b.w + gap &&
    a.x + a.w + gap > b.x - gap &&
    a.y - gap < b.y + b.h + gap &&
    a.y + a.h + gap > b.y - gap
}

// Raster (embedded) images are placed via `cm … Do` in the content stream.
// pdf.js emits the `cm` as a `transform` op and the `Do` as a paint op whose
// args are [name, pixelW, pixelH] — the placement box is the CTM at paint
// time (translation = bottom-left corner, scale = drawn size in pt).
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

function clusterFigurePaths(paths, pageW, pageH) {
  const pageArea = pageW * pageH
  // drop page frames / content borders (huge boxes)
  const candidates = paths.filter(p => p.w * p.h < FRAME_AREA_RATIO * pageArea)
  // also drop tiny noise
  const figs = candidates.filter(p => p.w >= MIN_FIGURE_SIZE || p.h >= MIN_FIGURE_SIZE)

  const clusters = []
  for (const p of figs) {
    let merged = false
    for (const c of clusters) {
      if (boxesOverlapExpanded(c, p, FIGURE_CLUSTER_GAP)) {
        const x = Math.min(c.x, p.x)
        const y = Math.min(c.y, p.y)
        const x2 = Math.max(c.x + c.w, p.x + p.w)
        const y2 = Math.max(c.y + c.h, p.y + p.h)
        c.x = x; c.y = y; c.w = x2 - x; c.h = y2 - y
        merged = true
        break
      }
    }
    if (!merged) clusters.push({ x: p.x, y: p.y, w: p.w, h: p.h })
  }
  return clusters.filter(c => c.w >= MIN_FIGURE_SIZE && c.h >= MIN_FIGURE_SIZE)
}

// ─── Page helpers ───────────────────────────────────────────────────────────

function groupItemsByY(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows = []
  for (const it of sorted) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(last.y - it.y) <= ROW_Y_TOLERANCE) {
      last.cells.push({ x: it.x, w: it.w, text: it.text })
    } else {
      rows.push({ y: it.y, cells: [{ x: it.x, w: it.w, text: it.text }] })
    }
  }
  for (const r of rows) {
    r.cells.sort((a, b) => a.x - b.x)
    const merged = []
    for (const c of r.cells) {
      const prev = merged[merged.length - 1]
      if (prev && c.x - (prev.x + prev.w) < CELL_MERGE_GAP) {
        prev.text += ' ' + c.text
        prev.w = Math.max(prev.w, c.x + c.w - prev.x)
      } else {
        merged.push({ ...c })
      }
    }
    r.cells = merged
    r.text = merged.map(c => c.text).join(' ')
  }
  return rows
}

function pageLines(items, pageIndex) {
  const rows = groupItemsByY(items)
  const lines = []
  for (const row of rows) {
    if (row.y < FOOTER_BAND_Y) continue // footer
    if (row.cells.length === 1 && row.cells[0].x > 470 && /^\d{1,3}$/.test(row.cells[0].text.trim())) continue
    lines.push({ y: row.y, x: row.cells[0]?.x ?? 0, text: row.text.trim(), cells: row.cells, pageIndex })
  }
  return lines.sort((a, b) => b.y - a.y)
}

function isTocPage(page) {
  // A TOC entry: dot-leader row whose text ENDS with a small page number
  // (form pages also have dotted lines, but they do not end in page numbers)
  // LV/RU TOCs use right-aligned "- N -" page numbers instead of dot leaders.
  let numberedDotRows = 0
  let rightNumbers = 0
  let dashedRightNumbers = 0
  const yRows = groupItemsByY(page.items)
  for (const row of yRows) {
    const joined = row.cells.map(c => c.text).join(' ')
    if (joined.includes('…') || /\.{3,}/.test(joined)) {
      if (/\b\d{1,3}\s*$/.test(joined.trim())) numberedDotRows++
    }
    const last = row.cells[row.cells.length - 1]
    if (last && last.x > 450) {
      const lt = last.text.trim()
      if (/^\d{1,3}$/.test(lt)) rightNumbers++
      else if (/^-\s*\d{1,3}\s*-$/.test(lt)) dashedRightNumbers++
    }
  }
  const hasContentHeading = page.lines.some(l => /^content$/i.test(l.text.trim()))
  return numberedDotRows >= 4 || rightNumbers >= 6 || dashedRightNumbers >= 4 || (hasContentHeading && (rightNumbers >= 3 || dashedRightNumbers >= 3))
}

// ─── Headings (EN / LV / RU) ────────────────────────────────────────────────
// WKF rule documents come in three languages:
//   EN: INTRODUCTION, ARTICLE N, APPENDIX N
//   LV: IEVADS, N. NODAĻA, N.PIELIKUMS
//   RU: ВВЕДЕНИЕ, СТАТЬЯ N, ПРИЛОЖЕНИЕ N
// All languages map to the same chapterKey (introduction / article-N /
// appendix-N) so translations merge into one chapter set per course.
// Note: `\b` fails for Cyrillic in JS regex, so use a lookahead instead.
// LV headings are number-first ("1. NODAĻA : …"), RU PDFs sometimes split or
// drop letters in the heading font ("ПРИЛОЖЕ НИЕ 1:", "ПРИЛОЕНИЕ1:",
// "СТАТЬЯ10:") – all tolerated below.

const HEADING_RE = /^(?:\d+[.\s]*)?(INTRODUCTION|ARTICLE|APPENDIX|IEVADS|NODAĻA|PIELIKUMS|ВВЕДЕНИЕ|СТАТЬЯ|ПРИЛОЖ?ЕНИЕ)(?=$|\s|:|\d)/i

// Real headings use a colon after the number ("ARTICLE 1: TITLE"). Body text
// like "APPENDIX 2. If a variation …" must NOT be treated as a heading.
const ARTICLE_PATTERNS = [
  /^ARTICLE\s+(\d+)\s*:\s*(.*)$/i,
  /^(\d+)\s*\.?\s*NODAĻA\s*:\s*(.*)$/i,
  /^СТАТЬЯ\s*(\d+)\s*:\s*(.*)$/i,
]

const APPENDIX_PATTERNS = [
  /^APPENDIX\s+(\d+)\s*:\s*(.*)$/i,
  /^(\d+)\s*\.?\s*PIELIKUMS\s*:\s*(.*)$/i,
  /^ПРИЛОЖ?ЕНИЕ\s*(\d+)\s*:\s*(.*)$/i,
]

const INTRO_PATTERNS = [/^INTRODUCTION\s*$/i, /^IEVADS\s*$/i, /^ВВЕДЕНИЕ\s*$/i]

// Repair space-split heading words (PDF font kerning artifacts):
//  - Cyrillic: "ПРИЛОЖЕ НИЕ 1:" → "ПРИЛОЖЕНИЕ 1:"
//  - letter-spaced ALL-CAPS (LV headings): "O F I C I Ā L A I S" → "OFICIĀLAIS"
function normalizeHeadingText(t) {
  return t
    .replace(/ПРИЛОЖЕ\s+НИЕ/gi, 'ПРИЛОЖЕНИЕ')
    // collapse letter-spaced ALL-CAPS runs (LV headings "O F I C I Ā L A I S"),
    // but keep spaces between whole words ("KATA COMPETITION AREA")
    .replace(/(?<=^|[^\p{Lu}\p{Nd}])(\p{Lu})\s+(?=\p{Lu}(?:[^\p{Lu}\p{Nd}]|$))/gu, '$1')
}

function parseHeading(lineText) {
  const t = normalizeHeadingText(lineText.trim())
  if (INTRO_PATTERNS.some(re => re.test(t))) {
    return { kind: 'introduction', number: 0, title: 'Introduction', key: 'introduction', order: 0 }
  }
  for (const re of ARTICLE_PATTERNS) {
    const m = t.match(re)
    if (m) {
      return { kind: 'article', number: parseInt(m[1], 10), title: (m[2] || '').trim(), key: `article-${m[1]}`, order: parseInt(m[1], 10) }
    }
  }
  for (const re of APPENDIX_PATTERNS) {
    const m = t.match(re)
    if (m) {
      return { kind: 'appendix', number: parseInt(m[1], 10), title: (m[2] || '').trim(), key: `appendix-${m[1]}`, order: 100 + parseInt(m[1], 10) }
    }
  }
  return null
}

function isHeadingLine(line) {
  const t = line.text.trim()
  // LV/RU headings are underlined with ____ – strip it before matching
  const clean = normalizeHeadingText(t.replace(/[\s_]+$/, ''))
  if (!HEADING_RE.test(clean)) return false
  // TOC entries have dot leaders / trailing page numbers – real headings never do
  if (/\.{3,}|…/.test(clean)) return false
  // TOC rows end with a page number ("- 3 -" in LV/RU, "… 3" in EN) – skip them
  if (/[-–]\s*\d{1,3}\s*[-–]?$/.test(clean)) return false
  const h = parseHeading(clean)
  if (!h) return false
  if (clean.length > 120) return false // long lines are body text mentioning ARTICLE
  if (h.kind === 'introduction') {
    return INTRO_PATTERNS.some(re => re.test(clean))
  }
  return true
}

const SUBCLAUSE_RE = /^(\d{1,2}(?:\.\d{1,2}){1,3})\s+(.+)$/
const LIST_LINE_RE = /^([a-z]\)|•|▪|◦|–|—|\d+\.|\(\d+\))\s+\S/i

// ─── Table detection ────────────────────────────────────────────────────────

function detectTable(lines, drawPathCount) {
  const runs = []
  let run = []
  for (const l of lines) {
    if (l.cells.length >= 2) {
      run.push(l)
    } else {
      if (run.length >= MIN_TABLE_ROWS) runs.push(run)
      run = []
    }
  }
  if (run.length >= MIN_TABLE_ROWS) runs.push(run)

  for (const candidate of runs) {
    if (candidate.some(r => r.cells.length < 2)) continue
    const colSpan = Math.max(...candidate.map(r => (r.cells[r.cells.length - 1]?.x ?? 0) - (r.cells[0]?.x ?? 0)))
    const colCount = Math.max(...candidate.map(r => r.cells.length))
    const strongDraw = drawPathCount > 100
    if (colCount >= 2 && (colSpan >= MIN_TABLE_COL_SPAN || strongDraw)) {
      return {
        rows: candidate,
        yFrom: Math.min(...candidate.map(r => r.y)),
        yTo: Math.max(...candidate.map(r => r.y)),
        colSpan,
        strongDraw,
      }
    }
  }
  return null
}

function buildTableBlock(table) {
  const maxCols = Math.max(...table.rows.map(r => r.cells.length))
  const pad = r => {
    const arr = r.cells.map(c => c.text)
    while (arr.length < maxCols) arr.push('')
    return arr
  }
  const ragged = table.rows.some(r => r.cells.length < maxCols - 1)
  return {
    id: uid(),
    type: 'table',
    content: {
      headers: pad(table.rows[0]),
      rows: table.rows.map(pad),
      caption: '',
    },
    needsReview: ragged || table.rows.length < 3 ? true : undefined,
  }
}

// ─── Figures ────────────────────────────────────────────────────────────────

function detectFigureRegions(page, tableYRange) {
  const allShapes = [...(page.drawPaths || []), ...(page.rasterImages || [])]
  if (!allShapes.length) return []
  const regions = clusterFigurePaths(allShapes, page.pageW, page.pageH)
  return regions
    .filter(f => f.y > FOOTER_BAND_Y) // skip footers
    .filter(f => !(tableYRange && f.y <= tableYRange.yTo + 2 && f.y + f.h >= tableYRange.yFrom - 2)) // skip table grid
    .map(f => ({
      x: f.x, y: f.y, w: f.w, h: f.h,
      caption: `Figure — page ${page.pageIndex + 1}`,
      pageIndex: page.pageIndex,
    }))
}

function pointInBox(px, py, box, pad = 4) {
  return px >= box.x - pad && px <= box.x + box.w + pad && py >= box.y - pad && py <= box.y + box.h + pad
}

// ─── Text / list building ───────────────────────────────────────────────────

function buildTextAndListBlocks(lines) {
  const blocks = []
  const paragraphs = []
  let current = []
  let prevY = null
  for (const l of lines) {
    if (prevY !== null && (prevY - l.y) > 14) {
      if (current.length) { paragraphs.push(current); current = [] }
    }
    current.push(l)
    prevY = l.y
  }
  if (current.length) paragraphs.push(current)

  for (const para of paragraphs) {
    const markerLines = para.filter(l => LIST_LINE_RE.test(l.text))
    if (markerLines.length >= 2 && markerLines.length / para.length >= 0.5) {
      const items = []
      for (const l of para) {
        if (LIST_LINE_RE.test(l.text)) {
          items.push(l.text)
        } else if (items.length) {
          items[items.length - 1] += ' ' + l.text
        }
      }
      const clean = items.map(i => i.trim()).filter(Boolean)
      if (clean.length >= 2) {
        blocks.push({ id: uid(), type: 'list', items: clean })
        continue
      }
    }

    const sub = para.find(l => SUBCLAUSE_RE.test(l.text) && l.text.length < 140)
    if (sub && para.length > 1) {
      let buf = ''
      const flush = () => { if (buf.trim()) blocks.push({ id: uid(), type: 'text', content: `<p>${escapeHtml(buf.trim())}</p>` }) }
      for (const l of para) {
        if (SUBCLAUSE_RE.test(l.text) && l.text.length < 140) {
          flush()
          buf = l.text
        } else {
          buf += (buf ? ' ' : '') + l.text
        }
      }
      flush()
    } else {
      const text = para.map(l => l.text).join(' ')
      if (text.trim()) blocks.push({ id: uid(), type: 'text', content: `<p>${escapeHtml(text.trim())}</p>` })
    }
  }
  return blocks
}

// ─── Main parse ─────────────────────────────────────────────────────────────

export async function parseChapterPdf(pdfjsLib, fileOrBuffer, options = {}) {
  const { renderFigure = null, onProgress = null } = options

  const data = fileOrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(fileOrBuffer)
    ? fileOrBuffer
    : await fileOrBuffer.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({ data }).promise
  const OPS = pdfjsLib.OPS

  // 1. Extract per-page items + drawing paths
  const pages = []
  for (let p = 1; p <= pdf.numPages; p++) {
    if (onProgress) onProgress({ page: p, total: pdf.numPages })
    const page = await pdf.getPage(p)
    const vp = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const items = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({
        x: it.transform[4],
        y: it.transform[5],
        w: it.width,
        text: it.str.replace(/\s+/g, ' ').trim(),
      }))
    let drawPaths = []
    let rasterImages = []
    try {
      const ops = await page.getOperatorList()
      drawPaths = getDrawingPaths(ops, OPS)
      rasterImages = getRasterImages(ops, OPS)
    } catch { /* vector ops may be unavailable */ }
    pages.push({ pageIndex: p - 1, page, pageW: vp.width, pageH: vp.height, items, drawPaths, rasterImages })
  }

  // 1b. Try to extract the document version from the running footer
  //     (e.g. "Rules Version 2026.01 N" appears at the bottom of content pages;
  //     the words are separate text items, so match on assembled rows)
  let sourceVersion = null
  for (const pg of pages) {
    const rows = groupItemsByY(pg.items)
    for (const row of rows) {
      const joined = row.cells.map(c => c.text).join(' ')
      const m = joined.match(/(?:Rules\s+Version|Noteikumu\s+versija|Версия(?:_\s*Правил)?)\s+([\d.]+)/i)
      if (m) { sourceVersion = m[1]; break }
    }
    if (sourceVersion) break
  }

  // 2. Classify pages: TOC (skip) vs content. Content starts AFTER the TOC block.
  const pageMeta = pages.map(pg => {
    const meta = { ...pg, lines: pageLines(pg.items, pg.pageIndex) }
    meta.isToc = isTocPage(meta)
    return meta
  })

  // TOC detection only applies to LEADING pages: find the first page that
  // contains a real heading (ignoring TOC pages), then skip the TOC block.
  let firstHeadingIdx = -1
  outer:
  for (const pg of pageMeta) {
    if (pg.isToc) continue
    for (const line of pg.lines) {
      if (isHeadingLine(line)) { firstHeadingIdx = pg.pageIndex; break outer }
    }
  }

  const tocBefore = pageMeta
    .filter(pg => pg.pageIndex < firstHeadingIdx && pg.isToc)
    .map(pg => pg.pageIndex)
  let contentStart
  if (tocBefore.length) {
    contentStart = Math.max(...tocBefore) + 1
  } else {
    contentStart = firstHeadingIdx
  }
  if (contentStart === -1 || contentStart >= pageMeta.length) {
    throw new Error('No content pages found in this PDF')
  }
  const contentPages = pageMeta.slice(contentStart)

  // 3. Find headings on content pages (joins wrapped continuation lines)
  const headings = []
  for (const pg of contentPages) {
    const lines = pg.lines
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]
      if (!isHeadingLine(line)) continue
      const h = parseHeading(line.text)
      if (!h) continue
      let title = h.title
      // continuation lines: same page, just below, not another heading/clause
      let j = li + 1
      while (j < lines.length) {
        const cont = lines[j]
        if (lines[li].y - cont.y > 18) break
        if (isHeadingLine(cont)) break
        if (SUBCLAUSE_RE.test(cont.text)) break
        // A heading continuation is still part of the title (ALL-CAPS wraps).
        // A line containing lowercase text starts the body — stop there.
        if (/\p{Ll}/u.test(cont.text)) break
        title = (title ? title + ' ' : '') + cont.text.trim()
        j++
      }
      title = title.replace(/\s*[._]+\s*$/, '').replace(/\s+/g, ' ').trim()
      headings.push({ ...h, title, pageIndex: pg.pageIndex, y: line.y, line })
      li = j - 1
    }
  }
  const seenKeys = new Set()
  const uniqueHeadings = headings.filter(h => {
    if (seenKeys.has(h.key)) return false
    seenKeys.add(h.key)
    return true
  })
  if (uniqueHeadings.length === 0) {
    throw new Error('No INTRODUCTION / ARTICLE / APPENDIX headings detected in the content. This parser expects a rules-style document with such sections.')
  }

  // 4. Slice content into sections between headings
  const sourceName = typeof fileOrBuffer === 'string' ? fileOrBuffer
    : (fileOrBuffer && fileOrBuffer.name) ? fileOrBuffer.name : 'document.pdf'

  const chapters = []
  for (let i = 0; i < uniqueHeadings.length; i++) {
    const h = uniqueHeadings[i]
    const next = uniqueHeadings[i + 1] || null

    const blocks = []
    const sourcePageFrom = h.pageIndex + 1
    const sourcePageTo = next ? next.pageIndex + 1 : pages.length

    for (const pg of contentPages) {
      if (pg.pageIndex < h.pageIndex) continue
      if (next && pg.pageIndex > next.pageIndex) break

      // clip lines to section bounds
      let lines = pg.lines
      if (pg.pageIndex === h.pageIndex) lines = lines.filter(l => l.y < h.y - 2)
      if (next && pg.pageIndex === next.pageIndex) lines = lines.filter(l => l.y > next.y + 2)

      // exclude the heading line and its wrapped continuation lines
      lines = lines.filter(l => !(l.pageIndex === h.pageIndex && h.y - l.y <= 18))

      // table detection
      let table = null
      if (lines.length >= MIN_TABLE_ROWS) {
        table = detectTable(lines, pg.drawPaths.length)
      }
      let tableYRange = null
      if (table) {
        tableYRange = { yFrom: table.yFrom, yTo: table.yTo }
        blocks.push(buildTableBlock(table))
      }

      // figure detection (collapse many small figures into one region)
      let figureRegions = detectFigureRegions(pg, tableYRange)
      if (figureRegions.length >= 4) {
        const x = Math.min(...figureRegions.map(f => f.x))
        const y = Math.min(...figureRegions.map(f => f.y))
        const x2 = Math.max(...figureRegions.map(f => f.x + f.w))
        const y2 = Math.max(...figureRegions.map(f => f.y + f.h))
        figureRegions = [{
          x, y, w: x2 - x, h: y2 - y,
          caption: `Figures — page ${pg.pageIndex + 1}`,
          pageIndex: pg.pageIndex,
        }]
      }
      for (const fig of figureRegions) {
        let blob = null
        if (renderFigure) {
          try { blob = await renderFigure(pg.page, fig) } catch { blob = null }
        }
        blocks.push({
          id: uid(),
          type: 'image',
          media: null,
          caption: fig.caption,
          alt: fig.caption,
          _figure: blob ? { blob } : null,
          _sourcePage: pg.pageIndex + 1,
        })
      }

      // text / lists from remaining lines
      let textLines = lines
      if (tableYRange) {
        textLines = textLines.filter(l => l.y > tableYRange.yTo + 2 || l.y < tableYRange.yFrom - 2)
      }
      for (const fig of figureRegions) {
        textLines = textLines.filter(l => !pointInBox(l.x, l.y, fig))
      }
      blocks.push(...buildTextAndListBlocks(textLines))
    }

    const title = h.title || (h.kind === 'introduction' ? 'Introduction' : `${h.kind} ${h.number}`)
    chapters.push({
      title,
      chapterKey: h.key,
      kind: h.kind,
      order: h.order,
      sourcePageFrom,
      sourcePageTo,
      sourceVersion,
      blocks,
    })
  }

  return { chapters, sourceFileName: sourceName, sourcePageCount: pages.length, sourceVersion }
}

// Content hash of a chapter (normalized text across blocks)
export function chapterContentHash(chapter) {
  return cyrb53(normalizeForHash(chapter.blocks || []))
}

// Browser figure renderer: renders the page region to a PNG blob
export async function createCanvasFigureRenderer() {
  const cache = new Map()
  const renderPageToCanvas = async (page, scale = 2) => {
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    return canvas
  }
  return async (page, fig) => {
    const pageNum = page.pageNumber
    let canvas = cache.get(pageNum)
    if (!canvas) {
      canvas = await renderPageToCanvas(page)
      cache.set(pageNum, canvas)
    }
    const scale = 2
    const sx = Math.max(0, fig.x * scale)
    const sy = canvas.height - (fig.y + fig.h) * scale // PDF y is bottom-up
    const sw = Math.min(canvas.width - sx, fig.w * scale)
    const sh = Math.min(canvas.height - sy, fig.h * scale)
    if (sw < 4 || sh < 4) return null
    const out = document.createElement('canvas')
    out.width = Math.round(sw)
    out.height = Math.round(sh)
    out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height)
    const blob = await new Promise(resolve => out.toBlob(resolve, 'image/png'))
    return blob
  }
}

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api, { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { DocumentArrowUpIcon, BookOpenIcon, CheckCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Regex to match "ARTICLE 1 : TITLE", "ARTICLE 2 :  KUMITE COMPETITION AREA", etc.
// Captures group 1 = article number, group 2 = title text
const ARTICLE_RE = /ARTICLE\s+(\d+)\s*:\s*([^\n]+)/gi

// Regex to match "APPENDIX 1 : TITLE" etc.
const APPENDIX_RE = /APPENDIX\s+(\d+)\s*:\s*([^\n]+)/gi

// Regex for sub-clause headings like "1.1", "2.1.1", "3.1.2.1", etc.
// Only match if it looks like a real subheading (short, at line start)
const SUBCLAUSE_RE = /^(\d{1,2}(?:\.\d{1,2}){1,3})\s+(.{3,}?)$/m

// Strips repeated running headers like "Rules Version 2026.01 13" that appear on every page
function stripRunningHeaders(text) {
  return text.replace(/Rules\s+Version\s+[\d.]+\s*\d*/gi, '')
}

// Remove the Table of Contents: cut everything before "INTRODUCTION" or first ARTICLE.
// WKF rules PDFs always have a TOC before INTRODUCTION that would falsely match ARTICLE headings.
function removeToc(text) {
  // Try splitting at INTRODUCTION first (most reliable for WKF rules)
  const introIdx = text.indexOf('INTRODUCTION')
  if (introIdx > 0) {
    return text.slice(introIdx)
  }
  // Fallback: find first ARTICLE heading and start there
  const firstArticle = text.match(ARTICLE_RE)
  if (firstArticle) {
    const idx = text.indexOf(firstArticle[0])
    if (idx > 0) return text.slice(idx)
  }
  return text
}

// Split body text into individual blocks by sub-clause boundaries (1.1, 1.2, 2.1.1, etc.)
function splitIntoBlocks(body) {
  const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 2)
  const blocks = []
  let currentText = ''

  for (const line of lines) {
    const match = line.match(SUBCLAUSE_RE)
    if (match) {
      // Flush previous block
      if (currentText.trim()) {
        blocks.push({
          id: crypto.randomUUID(),
          type: 'text',
          content: `<p>${escapeHtml(currentText.trim())}</p>`,
        })
      }
      currentText = line
    } else {
      if (currentText) currentText += ' ' + line
      else currentText = line
    }
  }

  // Flush last block
  if (currentText.trim()) {
    blocks.push({
      id: crypto.randomUUID(),
      type: 'text',
      content: `<p>${escapeHtml(currentText.trim())}</p>`,
    })
  }

  return blocks
}

async function parseChapterPdf(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Step 1: Extract full text page-by-page preserving line order
  let allLines = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    let lastY = null

    for (const item of content.items) {
      const y = Math.round(item.transform[5])
      if (lastY !== null && Math.abs(y - lastY) < 5) {
        allLines[allLines.length - 1] += item.str
      } else {
        allLines.push(item.str)
        lastY = y
      }
    }

    allLines.push('') // page break separator (helps detect repeated page headers)
  }

  let fullText = allLines.join('\n')

  // Step 2: Strip running headers/footers that repeat on every page
  fullText = stripRunningHeaders(fullText)

  // Step 3: Detect and remove the Table of Contents (pages before INTRODUCTION)
  fullText = removeToc(fullText)

  if (fullText.trim().length < 10) {
    throw new Error('No meaningful content found after stripping headers and TOC')
  }

  // Step 4: Use finditer-style matching to locate ALL article headings
  // Reset regex lastIndex
  ARTICLE_RE.lastIndex = 0
  const articleMatches = []
  let match
  while ((match = ARTICLE_RE.exec(fullText)) !== null) {
    articleMatches.push({
      number: parseInt(match[1], 10),
      title: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  // Also find APPENDIX headings
  APPENDIX_RE.lastIndex = 0
  const appendixMatches = []
  while ((match = APPENDIX_RE.exec(fullText)) !== null) {
    appendixMatches.push({
      number: parseInt(match[1], 10),
      title: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
      isAppendix: true,
    })
  }

  // Merge article + appendix matches, sorted by position in text
  const allHeadings = [...articleMatches, ...appendixMatches].sort((a, b) => a.start - b.start)

  if (allHeadings.length === 0) {
    // Fallback: treat whole PDF as one chapter
    const paragraphs = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 3)
    if (paragraphs.length === 0) throw new Error('No text found in PDF')
    const blocks = splitIntoBlocks(paragraphs.join('\n'))
    return [{ title: paragraphs[0] || 'Untitled', blocks }]
  }

  // Step 5: Slice text between consecutive heading matches
  const chapters = []
  for (let i = 0; i < allHeadings.length; i++) {
    const h = allHeadings[i]
    const bodyStart = h.end
    const bodyEnd = i + 1 < allHeadings.length ? allHeadings[i + 1].start : fullText.length
    const body = fullText.slice(bodyStart, bodyEnd).trim()

    const blocks = splitIntoBlocks(body)

    chapters.push({
      title: h.title,
      order: h.number,
      blocks,
      isAppendix: h.isAppendix || false,
    })
  }

  return chapters
}

export default function AdminChaptersImport() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [chapters, setChapters] = useState([]) // [{ title, blocks }]
  const [selectedCourse, setSelectedCourse] = useState('')
  const [baseLanguage, setBaseLanguage] = useState('lv')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const [chapterTitles, setChapterTitles] = useState([])
  const [expandedChapters, setExpandedChapters] = useState(new Set())

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=titleLv:asc&pagination[page]=1&pagination[pageSize]=200').then(r => r.data.data)
  })

  const handleFileChange = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setChapters([])
    setChapterTitles([])
    setImportedCount(0)
    setParsing(true)

    try {
      const parsed = await parseChapterPdf(f)
      setChapters(parsed)
      setChapterTitles(parsed.map(ch => ch.title))
      setExpandedChapters(new Set())
    } catch (err) {
      setError('Failed to parse PDF: ' + err.message)
    } finally {
      setParsing(false)
    }
  }

  const updateTitle = (index, newTitle) => {
    const updated = [...chapterTitles]
    updated[index] = newTitle
    setChapterTitles(updated)
  }

  const handleImportAll = async () => {
    if (!selectedCourse || chapters.length === 0) return
    setImporting(true)
    setError('')

    try {
      // Get current max order for this course
      const existing = await api.get(
        `/chapters?filters[course][documentId][$eq]=${selectedCourse}&sort=order:desc&pagination[page]=1&pagination[pageSize]=1`
      ).then(r => r.data.data || [])

      let nextOrder = existing.length > 0 ? (existing[0].order || 0) + 1 : 1
      let imported = 0

      const titleKey = `title${baseLanguage.charAt(0).toUpperCase() + baseLanguage.slice(1)}`
      const blocksKey = `blocks${baseLanguage.charAt(0).toUpperCase() + baseLanguage.slice(1)}`

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i]
        const data = {
          [titleKey]: chapterTitles[i] || ch.title,
          [blocksKey]: ch.blocks,
          order: ch.order || nextOrder + i,
          baseLanguage,
          sourceMode: 'pdf',
          course: { connect: [selectedCourse] },
        }
        await api.post('/chapters', { data })
        imported++
      }

      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] })
      setImportedCount(imported)
    } catch (err) {
      console.error('Import failed:', err.response?.data || err.message)
      setError('Failed to import: ' + (err.response?.data?.error?.message || err.message))
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setChapters([])
    setChapterTitles([])
    setSelectedCourse('')
    setImportedCount(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">{t('admin.chaptersImport.title')}</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('admin.chaptersImport.description') || 'Upload a rules PDF — each'} <strong>ARTICLE</strong> {t('admin.chaptersImport.headingBecomes') || 'heading becomes a separate chapter.'}
        {t('admin.chaptersImport.editHint') || 'You can edit titles before importing.'}
      </p>

      <div className="space-y-4">
        {/* Step 1: Upload */}
        <div className="" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>1. {t('admin.chaptersImport.uploadStep')}</h2>
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <DocumentArrowUpIcon className="w-10 h-10 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {file ? file.name : t('admin.chaptersImport.selectFile')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('admin.chaptersImport.acceptFormat')}
            </p>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          </div>

          {parsing && (
            <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              {t('admin.chaptersImport.parsing')}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        {/* Step 2: Preview detected chapters */}
        {chapters.length > 0 && (
          <div className="" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('admin.chaptersImport.detectedStep')} ({chapters.length})
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (expandedChapters.size === chapters.length) {
                    setExpandedChapters(new Set())
                  } else {
                    setExpandedChapters(new Set(chapters.map((_, i) => i)))
                  }
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {expandedChapters.size === chapters.length ? t('admin.chaptersImport.collapseAll') : t('admin.chaptersImport.expandAll')}
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {chapters.map((ch, i) => {
                const isExpanded = expandedChapters.has(i)
                return (
                  <div
                    key={i}
                    className="rounded-lg border overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <span
                          className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={chapterTitles[i] || ''}
                              onChange={e => updateTitle(i, e.target.value)}
                              className="flex-1 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(expandedChapters)
                                if (next.has(i)) next.delete(i)
                                else next.add(i)
                                setExpandedChapters(next)
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                              aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
                            >
                              <ChevronDownIcon
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                style={{ color: 'var(--text-muted)' }}
                              />
                            </button>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {t('admin.chaptersImport.blocksOfContent', { count: ch.blocks.length })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expandable block previews */}
                    {isExpanded && ch.blocks.length > 0 && (
                      <div className="border-t px-4 py-3 space-y-2 max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                        {ch.blocks.map((block, bi) => (
                          <div
                            key={block.id}
                            className="p-2.5 rounded text-sm"
                            style={{ backgroundColor: 'var(--bg-card)' }}
                          >
                            <span className="text-[10px] font-mono mr-2" style={{ color: 'var(--text-muted)' }}>
                              #{bi + 1}
                            </span>
                            <span dangerouslySetInnerHTML={{
                              __html: (block.content || '')
                                .replace(/<\/?p>/g, '')
                                .substring(0, 200)
                            }} />
                            {block.content?.length > 200 && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>...</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isExpanded && ch.blocks.length === 0 && (
                      <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{t('admin.chaptersImport.noContent')}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Course & Language */}
        {chapters.length > 0 && importedCount === 0 && (
          <div className="" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>3. {t('admin.chaptersImport.courseLangStep')}</h2>
            <div className="space-y-3">
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">{t('admin.chaptersImport.selectCourse') || 'Select course'}</option>
                {courses?.map(c => (
                  <option key={c.id} value={c.documentId}>
                    {getLocalizedField(c, i18n.language, 'title') || c.titleLv}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                {[
                  { code: 'lv', label: '🇱🇻 Latviešu' },
                  { code: 'ru', label: '🇷🇺 Русский' },
                  { code: 'en', label: '🇬🇧 English' },
                ].map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setBaseLanguage(lang.code)}
                    className="flex-1 py-2 rounded-lg border text-sm font-medium transition"
                    style={{
                      backgroundColor: baseLanguage === lang.code ? '#2563eb' : 'var(--bg-secondary)',
                      color: baseLanguage === lang.code ? 'white' : 'var(--text-primary)',
                      borderColor: baseLanguage === lang.code ? '#2563eb' : 'var(--border)',
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Import */}
        {chapters.length > 0 && selectedCourse && importedCount === 0 && (
          <div className="" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>4. {t('admin.chaptersImport.importStep')}</h2>
            <button
              onClick={handleImportAll}
              disabled={importing}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('admin.chaptersImport.importingChapters', { count: chapters.length })}
                </>
              ) : (
                <>
                  <BookOpenIcon className="w-5 h-5" />
                  {t('admin.chaptersImport.importAll', { count: chapters.length })}
                </>
              )}
            </button>
          </div>
        )}

        {/* Result */}
        {importedCount > 0 && (
          <div className="rounded-xl p-5 border border-green-200" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-700">{t('admin.chaptersImport.importComplete')}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('admin.chaptersImport.importedCount', { count: importedCount })}
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="w-full py-2 rounded-lg text-sm border transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
            >
              {t('admin.chaptersImport.importAnother')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

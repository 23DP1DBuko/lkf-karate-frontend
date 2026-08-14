import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api, { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { parseChapterPdf, chapterContentHash, createCanvasFigureRenderer } from '../../utils/pdfChapterParser'
import FileDropzone from '../../components/FileDropzone'
import {
  DocumentArrowUpIcon, BookOpenIcon, CheckCircleIcon, ChevronDownIcon,
  DocumentTextIcon, PhotoIcon, TableCellsIcon, ListBulletIcon,
  ExclamationTriangleIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

const BLOCK_BADGES = {
  text: { label: 'Text', icon: DocumentTextIcon, cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  list: { label: 'List', icon: ListBulletIcon, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  table: { label: 'Table', icon: TableCellsIcon, cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  image: { label: 'Image', icon: PhotoIcon, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
}

async function uploadFigureBlob(blob, page) {
  const formData = new FormData()
  formData.append('files', blob, `figure-page-${page}.png`)
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.[0] || null
}

export default function AdminChaptersImport() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [file, setFile] = useState(null)
  const [chapters, setChapters] = useState([]) // [{ title, chapterKey, order, sourcePageFrom/To, contentHash, blocks }]
  const [selectedCourse, setSelectedCourse] = useState('')
  const [baseLanguage, setBaseLanguage] = useState('lv')
  const [parsing, setParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null) // { created, updated, skipped, failed: [] }
  const [chapterTitles, setChapterTitles] = useState([])
  const [expandedChapters, setExpandedChapters] = useState(new Set())

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=titleLv:asc&pagination[page]=1&pagination[pageSize]=200').then(r => r.data.data),
  })

  const handleFileChange = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setChapters([])
    setChapterTitles([])
    setSummary(null)
    setParsing(true)
    setParseProgress(0)

    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'

      const renderFigure = await createCanvasFigureRenderer()
      const result = await parseChapterPdf(pdfjsLib, f, {
        renderFigure,
        onProgress: p => setParseProgress(p.page / p.total),
      })

      const parsed = result.chapters.map(ch => ({
        ...ch,
        sourceFileName: result.sourceFileName,
        sourceVersion: result.sourceVersion,
        contentHash: chapterContentHash(ch),
      }))
      setChapters(parsed)
      setChapterTitles(parsed.map(ch => ch.title))
      setExpandedChapters(new Set())
      setParseProgress(1)
    } catch (err) {
      console.error('Parse failed:', err)
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

  const stripInternal = (block) => {
    const { _figure, _sourcePage, ...rest } = block
    return rest
  }

  const handleImportAll = async () => {
    if (!selectedCourse || chapters.length === 0) return
    setImporting(true)
    setError('')
    setSummary(null)

    const lang = baseLanguage
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
    const titleKey = `title${cap(lang)}`
    const blocksKey = `blocks${cap(lang)}`

    const results = { created: 0, updated: 0, skipped: 0, failed: [] }

    try {
      // Fetch existing chapters of this course (published + drafts) for dedupe
      const FIELDS = 'fields[0]=documentId&fields[1]=chapterKey&fields[2]=contentHash&pagination[page]=1&pagination[pageSize]=200'
      const [pubRes, draftRes] = await Promise.all([
        api.get(`/chapters?filters[course][documentId][$eq]=${selectedCourse}&status=published&${FIELDS}`),
        api.get(`/chapters?filters[course][documentId][$eq]=${selectedCourse}&status=draft&${FIELDS}`),
      ])
      const byKey = new Map()
      for (const e of [...(pubRes.data.data || []), ...(draftRes.data.data || [])]) {
        if (!byKey.has(e.chapterKey)) byKey.set(e.chapterKey, e)
      }

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i]
        try {
          // Decide the action FIRST so unchanged reimports never touch the media library
          const match = byKey.get(ch.chapterKey)
          if (match && match.contentHash === ch.contentHash) {
            results.skipped++ // identical content – do not create a duplicate
            continue
          }

          // upload extracted figures to the media library (create/update only)
          const blocks = []
          for (const b of ch.blocks) {
            if (b.type === 'image' && b._figure?.blob) {
              const fileObj = await uploadFigureBlob(b._figure.blob, b._sourcePage || 0)
              blocks.push({ ...stripInternal(b), media: fileObj ? { type: 'image', file: fileObj } : null })
            } else {
              blocks.push(stripInternal(b))
            }
          }

          const data = {
            [titleKey]: (chapterTitles[i] || ch.title).trim() || ch.title,
            [blocksKey]: blocks,
            order: ch.order,
            baseLanguage: lang,
            sourceMode: 'pdf',
            sourceFile: ch.sourceFileName,
            sourceVersion: ch.sourceVersion || null,
            chapterKey: ch.chapterKey,
            contentHash: ch.contentHash,
            sourcePageFrom: ch.sourcePageFrom,
            sourcePageTo: ch.sourcePageTo,
          }

          if (!match) {
            await api.post('/chapters?status=published', {
              data: { ...data, course: { connect: [selectedCourse] } },
            })
            results.created++
          } else {
            await api.put(`/chapters/${match.documentId}?status=published`, { data })
            results.updated++
          }
        } catch (err) {
          results.failed.push({
            title: ch.title,
            error: err.response?.data?.error?.message || err.message,
          })
        }
      }

      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] })
      setSummary(results)
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
    setSummary(null)
    setError('')
  }

  const countByType = (blocks) => {
    const counts = {}
    for (const b of blocks) counts[b.type] = (counts[b.type] || 0) + 1
    return counts
  }

  const allExpanded = expandedChapters.size === chapters.length

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">{t('admin.chaptersImport.title')}</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('admin.chaptersImport.description') || 'Upload a rules PDF — each'}{' '}
        <strong>INTRODUCTION / ARTICLE / APPENDIX</strong>{' '}
        {t('admin.chaptersImport.headingBecomes') || 'heading becomes a separate chapter.'}{' '}
        {t('admin.chaptersImport.tableHint') || 'Tables and figures are extracted as blocks. The table of contents is skipped automatically.'}
      </p>

      <div className="space-y-4">
        {/* Step 1: Upload */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} className="rounded-xl p-5">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>1. {t('admin.chaptersImport.uploadStep')}</h2>
          <FileDropzone
            icon={<DocumentArrowUpIcon className="w-7 h-7" />}
            title={(dragging) =>
              file
                ? file.name
                : dragging
                  ? 'Drop the PDF here'
                  : t('admin.chaptersImport.selectFile')
            }
            hint={t('admin.chaptersImport.acceptFormat')}
            showBrowseHint={!file}
            accept=".pdf"
            ariaLabel="Upload PDF file"
            className="py-10"
            onFiles={(files) => {
              const f = files[0]
              if (f) handleFileChange({ target: { files: [f] } })
            }}
          />

          {parsing && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {t('admin.chaptersImport.parsing')}
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${Math.round(parseProgress * 100)}%` }}
                />
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        {/* Step 2: Preview detected chapters */}
        {chapters.length > 0 && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} className="rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('admin.chaptersImport.detectedStep')} ({chapters.length})
              </h2>
              <button
                type="button"
                onClick={() => setExpandedChapters(allExpanded ? new Set() : new Set(chapters.map((_, i) => i)))}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {allExpanded ? t('admin.chaptersImport.collapseAll') : t('admin.chaptersImport.expandAll')}
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {chapters.map((ch, i) => {
                const isExpanded = expandedChapters.has(i)
                const counts = countByType(ch.blocks)
                const reviewCount = ch.blocks.filter(b => b.needsReview).length
                return (
                  <div
                    key={ch.chapterKey + i}
                    className="rounded-lg border overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
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

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700" style={{ color: 'var(--text-muted)' }}>
                              {ch.chapterKey}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700" style={{ color: 'var(--text-muted)' }}>
                              {t('admin.chaptersImport.source', { from: ch.sourcePageFrom, to: ch.sourcePageTo })}
                            </span>
                            {Object.entries(counts).map(([type, n]) => {
                              const badge = BLOCK_BADGES[type]
                              if (!badge) return null
                              return (
                                <span key={type} className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.cls}`}>
                                  <badge.icon className="w-3 h-3" />
                                  {n} {t(`admin.chaptersImport.blocks.${type}`, { defaultValue: badge.label })}
                                </span>
                              )
                            })}
                            {reviewCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                {t('admin.chaptersImport.needsReview')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable block previews */}
                    {isExpanded && (
                      <div className="border-t px-4 py-3 space-y-2 max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                        {ch.blocks.map((block, bi) => (
                          <div key={block.id || bi} className="p-2.5 rounded text-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-mono mr-1" style={{ color: 'var(--text-muted)' }}>#{bi + 1}</span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${BLOCK_BADGES[block.type]?.cls || ''}`}>
                                {BLOCK_BADGES[block.type]?.label || block.type}
                              </span>
                              {block.needsReview && (
                                <span className="text-[10px] font-medium text-amber-600">⚠ {t('admin.chaptersImport.needsReview')}</span>
                              )}
                            </div>
                            {block.type === 'table' && (
                              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                {block.content?.headers?.join(' | ').slice(0, 120)}
                                {block.content?.rows?.length ? ` · ${block.content.rows.length} rows` : ''}
                              </p>
                            )}
                            {block.type === 'list' && (
                              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                {block.items?.slice(0, 3).join(' · ')}{block.items?.length > 3 ? ' …' : ''}
                              </p>
                            )}
                            {block.type === 'image' && (
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {block.caption || 'Figure'}
                              </p>
                            )}
                            {block.type === 'text' && (
                              <span dangerouslySetInnerHTML={{
                                __html: (block.content || '').replace(/<\/?p>/g, '').substring(0, 200),
                              }} />
                            )}
                          </div>
                        ))}
                        {ch.blocks.length === 0 && (
                          <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{t('admin.chaptersImport.noContent')}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Course & Language */}
        {chapters.length > 0 && !summary && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} className="rounded-xl p-5">
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('admin.chaptersImport.dupeHint') || 'Re-importing the same PDF is safe: identical chapters are skipped, changed ones are updated.'}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Import */}
        {chapters.length > 0 && selectedCourse && !summary && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} className="rounded-xl p-5">
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
        {summary && (
          <div className="rounded-xl p-5 border border-green-200" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-700">{t('admin.chaptersImport.importComplete')}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {summary.failed.length > 0
                    ? t('admin.chaptersImport.partialComplete', { count: summary.failed.length })
                    : t('admin.chaptersImport.allComplete')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg p-3 text-center border border-green-200 bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-600">{summary.created}</p>
                <p className="text-xs font-medium text-green-700">{t('admin.chaptersImport.createdLabel')}</p>
              </div>
              <div className="rounded-lg p-3 text-center border border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-2xl font-bold text-blue-600">{summary.updated}</p>
                <p className="text-xs font-medium text-blue-700">{t('admin.chaptersImport.updatedLabel')}</p>
              </div>
              <div className="rounded-lg p-3 text-center border border-gray-200 bg-gray-50 dark:bg-gray-800">
                <p className="text-2xl font-bold text-gray-500">{summary.skipped}</p>
                <p className="text-xs font-medium text-gray-500">{t('admin.chaptersImport.skippedLabel')}</p>
              </div>
            </div>

            {summary.failed.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-200 p-3 space-y-1.5">
                {summary.failed.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <XMarkIcon className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{f.title}</strong> — {f.error}
                    </span>
                  </div>
                ))}
              </div>
            )}

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

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api, { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { parseChapterPdf, chapterContentHash, createCanvasFigureRenderer } from '../../utils/pdfChapterParser'
import {
  CHAPTER_LANGUAGES, toPreviewChapters, updateChapterTitle, updateBlock, addBlock,
  removeBlock, moveBlock, copyLanguage, languageStats, countBlockTypes,
  blocksNeedingReview, buildChapterImportData, collectFigures, moveBaseLanguage,
} from '../../utils/chapterImportBlocks'
import FileDropzone from '../../components/FileDropzone'
import ChapterImportBlockEditor from '../../components/ChapterImportBlockEditor'
import {
  DocumentArrowUpIcon, BookOpenIcon, CheckCircleIcon, ChevronDownIcon,
  DocumentTextIcon, PhotoIcon, TableCellsIcon, ListBulletIcon,
  ExclamationTriangleIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

const LANGUAGE_LABELS = { lv: '🇱🇻 Latviešu', ru: '🇷🇺 Русский', en: '🇬🇧 English' }

const BLOCK_BADGES = {
  text: { label: 'Text', icon: DocumentTextIcon, cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  list: { label: 'List', icon: ListBulletIcon, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  table: { label: 'Table', icon: TableCellsIcon, cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  image: { label: 'Image', icon: PhotoIcon, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
}

const ADDABLE_TYPES = ['text', 'list', 'table', 'image']

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
  // [{ title, chapterKey, order, sourcePageFrom/To, contentHash,
  //    titles: { lv, ru, en }, blocks: { lv, ru, en }, edited }]
  const [chapters, setChapters] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [baseLanguage, setBaseLanguage] = useState('lv')
  const [activeLanguage, setActiveLanguage] = useState('lv')
  const [parsing, setParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importStage, setImportStage] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null) // { created, updated, skipped, failed: [] }
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
      setChapters(toPreviewChapters(parsed, baseLanguage))
      setActiveLanguage(baseLanguage)
      setExpandedChapters(new Set())
      setParseProgress(1)
    } catch (err) {
      console.error('Parse failed:', err)
      setError(t('admin.chaptersImport.parseFailed', { message: err.message }))
    } finally {
      setParsing(false)
    }
  }

  // The PDF is stored in exactly one base language. If the admin switches the
  // base language after parsing, move the parsed content into the new language
  // instead of leaving the payload's `baseLanguage` pointing at the old one.
  const changeBaseLanguage = (next) => {
    if (next === baseLanguage) return
    setChapters(prev => moveBaseLanguage(prev, next))
    setBaseLanguage(next)
    setActiveLanguage(next)
  }

  const handleImportAll = async () => {
    if (!selectedCourse || chapters.length === 0) return
    setImporting(true)
    setError('')
    setSummary(null)

    const results = { created: 0, updated: 0, skipped: 0, failed: [] }

    try {
      // 1. Upload every rendered figure once (block ids are shared across
      //    languages) and remember the media object per block.
      const mediaById = {}
      const figures = collectFigures(chapters)
      let uploaded = 0
      for (const [blockId, figure] of figures) {
        setImportStage(t('admin.chaptersImport.uploadingFigures', { done: uploaded, total: figures.size }))
        const fileObj = await uploadFigureBlob(figure.blob, figure.page)
        mediaById[blockId] = fileObj ? { type: 'image', file: fileObj } : null
        uploaded += 1
      }

      // 2. Fetch existing chapters of this course (published + drafts) to dedupe.
      setImportStage(t('admin.chaptersImport.savingChapters', { done: 0, total: chapters.length }))
      const FIELDS = 'fields[0]=documentId&fields[1]=chapterKey&fields[2]=contentHash&pagination[page]=1&pagination[pageSize]=200'
      const [pubRes, draftRes] = await Promise.all([
        api.get(`/chapters?filters[course][documentId][$eq]=${selectedCourse}&status=published&${FIELDS}`),
        api.get(`/chapters?filters[course][documentId][$eq]=${selectedCourse}&status=draft&${FIELDS}`),
      ])
      const byKey = new Map()
      for (const entry of [...(pubRes.data.data || []), ...(draftRes.data.data || [])]) {
        if (!byKey.has(entry.chapterKey)) byKey.set(entry.chapterKey, entry)
      }

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        setImportStage(t('admin.chaptersImport.savingChapters', { done: i, total: chapters.length }))
        try {
          const match = byKey.get(chapter.chapterKey)
          // Identical, untouched re-imports must not overwrite anything — this
          // also means edits made in a previous import survive a re-import.
          if (match && !chapter.edited && match.contentHash === chapter.contentHash) {
            results.skipped += 1
            continue
          }

          const data = buildChapterImportData(chapter, { mediaById })

          if (!match) {
            await api.post('/chapters?status=published', {
              data: { ...data, course: { connect: [selectedCourse] } },
            })
            results.created += 1
          } else {
            await api.put(`/chapters/${match.documentId}?status=published`, { data })
            results.updated += 1
          }
        } catch (err) {
          results.failed.push({
            title: chapter.titles?.[baseLanguage] || chapter.title,
            error: err.response?.data?.error?.message || err.message,
          })
        }
      }

      setImportStage('')
      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] })
      setSummary(results)
    } catch (err) {
      console.error('Import failed:', err.response?.data || err.message)
      setError(t('admin.chaptersImport.importFailed', {
        message: err.response?.data?.error?.message || err.message,
      }))
    } finally {
      setImporting(false)
      setImportStage('')
    }
  }

  const reset = () => {
    setFile(null)
    setChapters([])
    setSelectedCourse('')
    setSummary(null)
    setError('')
  }

  const allExpanded = chapters.length > 0 && expandedChapters.size === chapters.length
  const activeBlocksFor = (chapter) => chapter.blocks?.[activeLanguage] || []

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">{t('admin.chaptersImport.title')}</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('admin.chaptersImport.description')}{' '}
        <strong>INTRODUCTION / ARTICLE / APPENDIX</strong>{' '}
        {t('admin.chaptersImport.headingBecomes')}
        {t('admin.chaptersImport.tableHint')}
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
                  ? (t('admin.chaptersImport.dropHere') || 'Drop the PDF here')
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

        {/* Step 2: Preview + edit detected chapters */}
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

            {/* Spacing / formatting warning (required before saving) */}
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t('admin.chaptersImport.previewWarning')}
              </p>
            </div>

            {/* Language tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('admin.chaptersImport.editLanguage')}
              </span>
              {CHAPTER_LANGUAGES.map(language => {
                const isActive = language === activeLanguage
                const withContent = chapters.filter(c => languageStats(c)[language].hasContent).length
                return (
                  <button
                    key={language}
                    type="button"
                    onClick={() => setActiveLanguage(language)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border transition"
                    style={{
                      backgroundColor: isActive ? '#2563eb' : 'var(--bg-secondary)',
                      color: isActive ? 'white' : 'var(--text-primary)',
                      borderColor: isActive ? '#2563eb' : 'var(--border)',
                    }}
                  >
                    {LANGUAGE_LABELS[language]}
                    <span className="ml-1.5 opacity-80">
                      {withContent}/{chapters.length}
                    </span>
                    {language === baseLanguage && (
                      <span className="ml-1.5 text-[10px] uppercase opacity-90">{t('admin.chaptersImport.baseBadge')}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {chapters.map((chapter, i) => {
                const isExpanded = expandedChapters.has(i)
                const blocks = activeBlocksFor(chapter)
                const stats = languageStats(chapter)
                const activeStats = stats[activeLanguage]
                const counts = countBlockTypes(blocks)
                const reviewCount = blocksNeedingReview(blocks)
                return (
                  <div
                    key={chapter.chapterKey + i}
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
                              value={chapter.titles?.[activeLanguage] || ''}
                              onChange={e => setChapters(updateChapterTitle(chapters, i, activeLanguage, e.target.value))}
                              placeholder={t('admin.chaptersImport.titlePlaceholder') || 'Chapter title'}
                              aria-label={`${t('admin.chaptersImport.titlePlaceholder') || 'Chapter title'} (${activeLanguage})`}
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
                              {chapter.chapterKey}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700" style={{ color: 'var(--text-muted)' }}>
                              {t('admin.chaptersImport.source', { from: chapter.sourcePageFrom, to: chapter.sourcePageTo })}
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
                            {chapter.edited && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                {t('admin.chaptersImport.edited')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable block editing */}
                    {isExpanded && (
                      <div className="border-t px-4 py-3 space-y-2 max-h-[28rem] overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                        {activeStats.blocks === 0 && (
                          <div className="rounded-lg border border-dashed px-3 py-3 text-xs space-y-2"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                            <p>{t('admin.chaptersImport.languageEmpty')}</p>
                            {activeLanguage !== baseLanguage && (
                              <button
                                type="button"
                                onClick={() => setChapters(copyLanguage(chapters, i, baseLanguage, activeLanguage))}
                                className="px-2.5 py-1 rounded-lg border font-medium"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                              >
                                {t('admin.chaptersImport.copyFromBase')}
                              </button>
                            )}
                          </div>
                        )}

                        {blocks.map((block, bi) => (
                          <ChapterImportBlockEditor
                            key={block.id || bi}
                            block={block}
                            index={bi}
                            total={blocks.length}
                            labels={{
                              needsReview: t('admin.chaptersImport.needsReview'),
                              textPlaceholder: t('admin.chaptersImport.blockTextPlaceholder'),
                              listPlaceholder: t('admin.chaptersImport.blockListPlaceholder'),
                              tableCaption: t('admin.chaptersImport.tableCaption'),
                              tableCaptionPlaceholder: t('admin.chaptersImport.tableCaptionPlaceholder'),
                              tableText: t('admin.chaptersImport.tableText'),
                              regenerateTableText: t('admin.chaptersImport.regenerateTableText'),
                              imageCaptured: t('admin.chaptersImport.imageCaptured'),
                              imageMissing: t('admin.chaptersImport.imageMissing'),
                              imageDescription: t('admin.chaptersImport.imageDescription'),
                              imageDescriptionPlaceholder: t('admin.chaptersImport.imageDescriptionPlaceholder'),
                            }}
                            onChange={(updated) => setChapters(updateBlock(chapters, i, activeLanguage, bi, updated))}
                            onRemove={() => setChapters(removeBlock(chapters, i, activeLanguage, bi))}
                            onMove={(dir) => setChapters(moveBlock(chapters, i, activeLanguage, bi, dir))}
                          />
                        ))}

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {ADDABLE_TYPES.map(type => {
                            const badge = BLOCK_BADGES[type]
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setChapters(addBlock(chapters, i, activeLanguage, type))}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition hover:border-blue-400"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                              >
                                + <badge.icon className="w-3 h-3" /> {badge.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Course & base language */}
        {chapters.length > 0 && !summary && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} className="rounded-xl p-5">
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>3. {t('admin.chaptersImport.courseLangStep')}</h2>
            <div className="space-y-3">
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                aria-label={t('admin.chaptersImport.selectCourse') || 'Select course'}
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
                {CHAPTER_LANGUAGES.map(code => (
                  <button
                    key={code}
                    onClick={() => changeBaseLanguage(code)}
                    className="flex-1 py-2 rounded-lg border text-sm font-medium transition"
                    style={{
                      backgroundColor: baseLanguage === code ? '#2563eb' : 'var(--bg-secondary)',
                      color: baseLanguage === code ? 'white' : 'var(--text-primary)',
                      borderColor: baseLanguage === code ? '#2563eb' : 'var(--border)',
                    }}
                  >
                    {LANGUAGE_LABELS[code]}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('admin.chaptersImport.dupeHint')}
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
                  {importStage || t('admin.chaptersImport.importingChapters', { count: chapters.length })}
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

// AdminQuestionImport.jsx — UNIFIED question import page.
//
// One page for ALL question imports:
//   - Word (.docx) files with color-coded answers (green = true, red = false)
//     → correctAnswer stored immediately, NO quiz needed.
//   - Multilingual PDFs (No. | English | Latviešu | По русски columns)
//     → parsed WITHOUT answers, quiz needed afterwards.
//   - Single-language PDFs (one file per language, auto-detected + overridable)
//     → parsed WITHOUT answers, languages merged across files per question number.
//
// Flow:
//   1. Course + Year + Category + Type → questionSetKey (e.g. kumite-2024)
//   2. Upload files → per-file format/language detection (admin can override)
//   3. Analyze → parse all files, merge languages by (set + order), compare
//      against the DB and flag conflicts (same text differs / type differs)
//   4. Preview → editable questions, per-language conflict resolution
//   5. Import → create/update/skip; never overwrite an existing correctAnswer
//   6. If any question still lacks an answer → hand off to the answer-key quiz
//      (scoped to course + questionSetKey; later translation-only imports do
//      NOT reopen the quiz).
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api, { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import FileDropzone from '../../components/FileDropzone'
import {
  DocumentArrowUpIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { parseWordQuestions } from '../../utils/wordQuestionParser'
import {
  parsePdfQuestions,
  parseSingleLanguagePdfQuestions,
  detectMultilingualLayout,
  extractPdfText,
} from '../../utils/pdfQuestionParser'
import {
  buildQuestionSetKey,
  detectLanguageFromFilename,
  detectSingleLanguagePdf,
  LANG_LABELS,
} from '../../utils/questionSet'
import {
  fetchAllExistingQuestions,
  mergeSessionQuestions,
  mergeImportedQuestions,
  buildQuestionStats,
  attachQuestionHashes,
} from '../../utils/questionImport'

const FORMAT_META = {
  word: { label: 'Word', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  'pdf-multi': { label: 'Multilingual PDF', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  'pdf-single': { label: 'Single-language PDF', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  unknown: { label: 'Unknown format', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

const ACTION_META = {
  create: { label: 'New', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  update: { label: 'Update translation', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  skip: { label: 'Identical — skip', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  conflict: { label: 'Conflict — review', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

const LANGS = ['en', 'lv', 'ru']
const langKey = (lang) => `text${lang.charAt(0).toUpperCase()}${lang.slice(1)}`

async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'
  return pdfjsLib
}

export default function AdminQuestionImport() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  // Step 1 — question set identity
  const [courseId, setCourseId] = useState('')
  const [year, setYear] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('yes_no')

  // Step 2 — uploaded files with per-file detection
  const [files, setFiles] = useState([])
  const [inspecting, setInspecting] = useState(false)

  // Step 3 — parsing / merge / plan
  const [parsed, setParsed] = useState([])
  const [existing, setExisting] = useState([])
  const [parsing, setParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState(0)
  const [error, setError] = useState('')

  // Step 4 — conflict resolution + import
  const [resolutions, setResolutions] = useState({}) // { [order]: { [lang]: 'keep'|'overwrite' } }
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)

  const [needsQuiz, setNeedsQuiz] = useState(0) // unanswered questions in the set after import

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () =>
      api.get('/courses?sort=titleLv:asc&pagination[page]=1&pagination[pageSize]=200').then((r) => r.data.data),
  })

  const questionSetKey = buildQuestionSetKey({ category, year })

  // ── File inspection ──────────────────────────────────────────────────────
  const inspectFile = async (file) => {
    const name = (file.name || '').toLowerCase()
    if (/\.docx?$/.test(name)) {
      return { format: 'word', language: detectLanguageFromFilename(file.name) || 'lv' }
    }
    if (/\.pdf$/.test(name)) {
      const pdfjsLib = await loadPdfjs()
      const isMulti = await detectMultilingualLayout(pdfjsLib, file)
      if (isMulti) return { format: 'pdf-multi', language: null }
      const text = await extractPdfText(pdfjsLib, file, 3)
      const det = detectSingleLanguagePdf(text, file.name)
      return { format: 'pdf-single', language: det.language || 'lv' }
    }
    return { format: 'unknown', language: null, error: t('admin.importSet.unsupportedFile') || 'Unsupported file type — use .docx or .pdf' }
  }

  const handleAddFiles = async (fileList) => {
    const arr = Array.from(fileList || [])
    if (!arr.length) return
    setError('')
    setResults(null)
    setNeedsQuiz(0)

    const entries = arr.map((file, i) => ({
      id: `${file.name}-${Date.now()}-${i}`,
      file,
      format: null,
      language: null,
      inspecting: true,
      error: '',
    }))
    setFiles((prev) => [...prev, ...entries])
    setInspecting(true)

    for (const entry of entries) {
      try {
        const info = await inspectFile(entry.file)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, format: info.format, language: info.language, inspecting: false, error: info.error || '' }
              : f,
          ),
        )
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, format: 'unknown', language: null, inspecting: false, error: 'Inspection failed: ' + err.message }
              : f,
          ),
        )
      }
    }
    setInspecting(false)
  }

  const updateFile = (id, patch) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setResults(null)
  }

  const validFiles = files.filter((f) => f.format && f.format !== 'unknown')
  const allInspected = files.length > 0 && files.every((f) => !f.inspecting)

  // ── Analyze: parse all files, merge, compare with the DB ─────────────────
  const handleAnalyze = async () => {
    if (!courseId || !questionSetKey || !validFiles.length) return
    setError('')
    setResults(null)
    setNeedsQuiz(0)
    setParsing(true)
    setParseProgress(0)
    setResolutions({})

    try {
      const pdfjsLib = await loadPdfjs()
      const allParsed = []
      let done = 0
      const total = validFiles.length

      for (const f of validFiles) {
        try {
          if (f.format === 'word') {
            const qs = await parseWordQuestions(f.file, { language: f.language || 'lv' })
            allParsed.push(...qs)
          } else if (f.format === 'pdf-multi') {
            const res = await parsePdfQuestions(pdfjsLib, f.file, {
              onProgress: () => {},
            })
            allParsed.push(...res.questions)
          } else if (f.format === 'pdf-single') {
            const res = await parseSingleLanguagePdfQuestions(pdfjsLib, f.file, f.language || 'lv', {
              onProgress: () => {},
            })
            allParsed.push(...res.questions)
          }
        } catch (err) {
          setError((prev) =>
            prev ? `${prev}\n${f.file.name}: ${err.message}` : `${f.file.name}: ${err.message}`,
          )
        }
        done++
        setParseProgress(done / total)
      }

      const merged = mergeSessionQuestions(allParsed).map((q) => {
        // Apply the admin-selected question type + options to every question.
        const options = type === 'yes_no' ? ['true', 'false'] : []
        return {
          ...q,
          type,
          optionsEn: options,
          optionsLv: options,
          optionsRu: options,
        }
      })

      if (merged.length === 0 && !error) {
        setError(t('admin.importSet.noQuestions') || 'No questions detected in the uploaded files.')
      }

      setParsed(merged)
      setExisting(await fetchAllExistingQuestions(courseId))
    } catch (err) {
      console.error('Analyze failed:', err)
      setError('Failed to analyze files: ' + err.message)
    } finally {
      setParsing(false)
    }
  }

  const updateParsedQuestion = (index, lang, value) => {
    setParsed((prev) => prev.map((q, i) => (i === index ? { ...q, [langKey(lang)]: value } : q)))
    setResults(null)
  }

  // Plan is recomputed live from the (editable) parsed questions.
  const plan = useMemo(() => {
    if (!courseId || !questionSetKey || parsed.length === 0) return null
    return mergeImportedQuestions(parsed, existing, { courseId, questionSetKey })
  }, [parsed, existing, courseId, questionSetKey])

  const stats = useMemo(() => buildQuestionStats(parsed), [parsed])

  const unresolvedCount = useMemo(() => {
    if (!plan) return 0
    let n = 0
    for (const item of plan) {
      if (item.action !== 'conflict') continue
      for (const c of item.conflicts) {
        if (resolutions[item.q.order]?.[c.lang] !== 'keep' && resolutions[item.q.order]?.[c.lang] !== 'overwrite') n++
      }
    }
    return n
  }, [plan, resolutions])

  const resolveConflict = (order, lang, decision) => {
    setResolutions((prev) => ({
      ...prev,
      [order]: { ...(prev[order] || {}), [lang]: decision },
    }))
    setResults(null)
  }

  // ── Import ───────────────────────────────────────────────────────────────
  const buildCreateData = (q) => {
    const options = type === 'yes_no' ? ['true', 'false'] : []
    return attachQuestionHashes({
      textEn: q.textEn || null,
      textLv: q.textLv || null,
      textRu: q.textRu || null,
      type: q.type || 'yes_no',
      optionsEn: options,
      optionsLv: options,
      optionsRu: options,
      correctAnswer: q.correctAnswer, // null for PDF questions — set by the quiz
      answerStatus: q.answerStatus || 'missing',
      order: q.order,
      course: courseId,
      questionSetKey,
      sourceYear: year ? Number(year) : null,
      sourceCategory: category || null,
      sourceFiles: q.sourceFiles || [],
      sourceFile: (q.sourceFiles && q.sourceFiles[0]) || null,
      // Word questions carry their answers; PDF questions are tagged 'pdf'.
      sourceMode: q.answerStatus === 'fromWord' ? null : 'pdf',
    })
  }

  const buildMetaPatch = (existingQ, q) => {
    // Set the set identity once; merge the accumulated sourceFiles.
    const patch = {}
    if (!existingQ.questionSetKey) patch.questionSetKey = questionSetKey
    if (!existingQ.sourceYear && year) patch.sourceYear = Number(year)
    if (!existingQ.sourceCategory && category) patch.sourceCategory = category
    const srcFiles = new Set([...(existingQ.sourceFiles || []), ...(q.sourceFiles || [])])
    patch.sourceFiles = [...srcFiles]
    if (!existingQ.sourceFile && q.sourceFiles?.[0]) patch.sourceFile = q.sourceFiles[0]
    return patch
  }

  const handleImport = async () => {
    if (!plan || importing) return
    setImporting(true)
    setError('')
    setResults(null)

    const out = { created: 0, updated: 0, skipped: 0, conflictsSkipped: 0, failed: [] }

    for (const item of plan) {
      const q = item.q
      try {
        if (item.action === 'create') {
          const data = buildCreateData(q)
          // A Word-derived answer is saved immediately; PDF questions stay null.
          await api.post('/questions', { data })
          out.created++
          continue
        }

        if (item.action === 'skip') {
          out.skipped++
          continue
        }

        if (item.action === 'update') {
          await api.put(`/questions/${item.existing.documentId}`, {
            data: {
              ...item.patch,
              ...buildMetaPatch(item.existing, q),
              ...attachQuestionHashes({ textEn: q.textEn, textLv: q.textLv, textRu: q.textRu }),
            },
          })
          out.updated++
          continue
        }

        // conflict: apply per-language decisions ('overwrite' wins over 'keep').
        const patch = { ...item.patch }
        const decisions = resolutions[item.q.order] || {}
        for (const c of item.conflicts) {
          if (c.lang === 'type') {
            if (decisions[c.lang] === 'overwrite') patch.type = q.type
          } else if (decisions[c.lang] === 'overwrite') {
            patch[langKey(c.lang)] = q[langKey(c.lang)]
          }
        }
        if (Object.keys(patch).length > 0) {
          await api.put(`/questions/${item.existing.documentId}`, {
            data: {
              ...patch,
              ...buildMetaPatch(item.existing, q),
              ...attachQuestionHashes({ textEn: q.textEn, textLv: q.textLv, textRu: q.textRu }),
            },
          })
          out.updated++
        } else {
          out.conflictsSkipped++
        }
      } catch (err) {
        out.failed.push({ order: q.order, error: err.response?.data?.error?.message || err.message })
      }
    }

    setResults(out)
    setImporting(false)

    // After import, count how many questions of the set still miss an answer.
    try {
      const res = await api.get('/questions', {
        params: {
          'filters[course][documentId][$eq]': courseId,
          'filters[questionSetKey][$eq]': questionSetKey,
          'filters[answerStatus][$eq]': 'missing',
          'pagination[pageSize]': 1,
        },
      })
      setNeedsQuiz(res.data?.meta?.pagination?.total || 0)
    } catch {
      setNeedsQuiz(parsed.some((q) => q.correctAnswer == null) ? parsed.length : 0)
    }
  }

  const openAnswerKey = () => {
    navigate(
      `/admin/import-quiz?courseId=${encodeURIComponent(courseId)}&questionSetKey=${encodeURIComponent(questionSetKey)}`,
    )
  }

  const reset = () => {
    setFiles([]); setParsed([]); setExisting([]); setResults(null)
    setResolutions({}); setError(''); setNeedsQuiz(0)
    setCourseId(''); setYear(''); setCategory(''); setType('yes_no')
  }

  const canAnalyze = Boolean(courseId && questionSetKey && validFiles.length && allInspected && !parsing)
  const canImport = Boolean(plan && !importing && !results)

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">
        {t('admin.importSet.title') || 'Import Questions (Word & PDF)'}
      </h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('admin.importSet.description') ||
          'Import True/False question sets from Word (.docx with color-coded answers) or PDFs (multilingual or single-language, without answers).'}
      </p>

      <div className="space-y-4">
        {/* Step 1 — question set */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            1. {t('admin.importSet.setStep') || 'Course & question set'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={courseId}
              onChange={(e) => { setCourseId(e.target.value); setResults(null) }}
              className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">{t('admin.importSet.selectCourse') || 'Select course'}</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.documentId}>
                  {getLocalizedField(c, i18n.language, 'title') || c.titleLv}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={year}
              onChange={(e) => { setYear(e.target.value); setResults(null) }}
              placeholder={t('admin.importSet.yearPlaceholder') || 'Year — e.g. 2024'}
              className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />

            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setResults(null) }}
              className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">{t('admin.importSet.selectCategory') || 'Category'}</option>
              {['kata', 'kumite', 'secretary', 'seminar'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="yes_no">True / False (yes_no)</option>
              <option value="single_choice">Single Choice</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="open_text">Open Text</option>
            </select>
          </div>

          <div className="mt-3 p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {t('admin.importSet.setKeyLabel') || 'Question set key'}:
            </span>{' '}
            <code className="font-mono font-semibold text-blue-600">{questionSetKey || '—'}</code>
            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('admin.importSet.setKeyHint') ||
                'Built from category + year. Different years are separate sets (kumite-2024 ≠ kumite-2026).'}
            </p>
          </div>
        </div>

        {/* Step 2 — upload files */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            2. {t('admin.importSet.filesStep') || 'Upload files'}
          </h2>
          <FileDropzone
            icon={<DocumentArrowUpIcon className="w-7 h-7" />}
            title={(dragging) =>
              dragging ? 'Drop files here' : (t('admin.importSet.selectFiles') || 'Click to select Word / PDF files')
            }
            hint={t('admin.importSet.fileHint') ||
              'One multilingual PDF, several single-language PDFs (one per language), and/or Word files — in any combination.'}
            showBrowseHint={files.length === 0}
            accept=".docx,.pdf"
            multiple
            ariaLabel="Upload question files (Word or PDF)"
            onFiles={handleAddFiles}
          />

          {inspecting && (
            <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              {t('admin.importSet.detecting') || 'Detecting format & language…'}
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f) => {
                const meta = FORMAT_META[f.format] || FORMAT_META.unknown
                const showLang = f.format === 'word' || f.format === 'pdf-single'
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="flex-1 truncate text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {f.file.name}
                    </span>
                    {f.inspecting && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    {showLang && (
                      <select
                        value={f.language || ''}
                        onChange={(e) => updateFile(f.id, { language: e.target.value })}
                        aria-label="File language"
                        className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      >
                        <option value="" disabled>
                          {t('admin.importSet.languageLabel') || 'Language'}
                        </option>
                        {['en', 'lv', 'ru'].map((l) => (
                          <option key={l} value={l}>{LANG_LABELS[l]}</option>
                        ))}
                      </select>
                    )}
                    {f.error && (
                      <span className="text-xs text-red-500 flex-shrink-0 max-w-[180px] truncate" title={f.error}>{f.error}</span>
                    )}
                    <button
                      onClick={() => removeFile(f.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 flex-shrink-0"
                      aria-label={`Remove ${f.file.name}`}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-500 whitespace-pre-line">{error}</p>}

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                {t('admin.importSet.analyzing') || 'Analyzing…'}
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-5 h-5" />
                {t('admin.importSet.analyze') || 'Analyze files'}
              </>
            )}
          </button>

          {parsing && (
            <div className="mt-3 w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div className="h-1.5 rounded-full bg-blue-500 transition-all duration-200" style={{ width: `${Math.round(parseProgress * 100)}%` }} />
            </div>
          )}
        </div>

        {/* Step 3 — preview & merge */}
        {plan && stats && !results && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              3. {t('admin.importSet.previewStep') || 'Preview & merge'} ({stats.total})
            </h2>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center text-sm">
              <Stat label={t('admin.pdfImport.statDetected') || 'Detected'} value={stats.total} tone="blue" />
              <Stat label={t('admin.pdfImport.statComplete') || 'Complete (3 langs)'} value={stats.completeTranslations} tone="green" />
              <Stat label="EN" value={stats.total - stats.missingEn.length} tone={stats.missingEn.length ? 'amber' : 'green'} />
              <Stat label="LV" value={stats.total - stats.missingLv.length} tone={stats.missingLv.length ? 'amber' : 'green'} />
              <Stat label="RU" value={stats.total - stats.missingRu.length} tone={stats.missingRu.length ? 'amber' : 'green'} />
              <Stat label={t('admin.importSet.statAnswersMissing') || 'Answers missing'} value={stats.answersMissing} tone={stats.answersMissing ? 'amber' : 'green'} />
              <Stat label={t('admin.importSet.statDuplicates') || 'Duplicate №'} value={stats.duplicates.length} tone={stats.duplicates.length ? 'red' : 'gray'} />
              <Stat label={t('admin.importSet.statGaps') || 'Numbering gaps'} value={stats.gaps.length} tone={stats.gaps.length ? 'amber' : 'gray'} />
            </div>

            {(stats.duplicates.length > 0 || stats.sessionConflicts.length > 0) && (
              <div className="mb-3 p-3 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                {stats.duplicates.length > 0 && (
                  <p className="text-red-600">⚠ {t('admin.importSet.duplicateList', { list: stats.duplicates.join(', ') }) || `Duplicate question numbers: ${stats.duplicates.join(', ')}`}</p>
                )}
                {stats.sessionConflicts.map((c, i) => (
                  <p key={i} className="text-amber-600">
                    ⚠ #{c.order} · {c.lang.toUpperCase()} · {t('admin.importSet.sessionConflict') || 'files disagree on this text'}
                  </p>
                ))}
              </div>
            )}

            {/* Conflicts — require resolution */}
            {plan.some((p) => p.action === 'conflict') && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {t('admin.importSet.conflictsTitle', { count: plan.filter((p) => p.action === 'conflict').length }) ||
                    `${plan.filter((p) => p.action === 'conflict').length} conflict(s) need review`}
                </p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {t('admin.importSet.conflictHint') ||
                    'Existing text differs from the imported text. Nothing is overwritten automatically — decide per conflict.'}
                </p>
                <div className="space-y-2">
                  {plan.filter((p) => p.action === 'conflict').map((item) => (
                    <div key={item.q.order} className="rounded-lg border p-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <p className="text-xs font-mono font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>#{item.q.order}</p>
                      {item.conflicts.map((c) => {
                        const decision = resolutions[item.q.order]?.[c.lang]
                        return (
                          <div key={c.lang} className="mb-2">
                            <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                              {c.lang === 'type' ? t('admin.importSet.typeConflict') || 'Question type' : `${c.lang.toUpperCase()} · ${t('admin.importSet.textConflict') || 'text'}`}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                              <div className="p-2 rounded bg-gray-50 dark:bg-gray-800/60">
                                <p className="text-[10px] uppercase mb-0.5 text-gray-500">{t('admin.importSet.existing') || 'Existing'}</p>
                                <p style={{ color: 'var(--text-primary)' }}>{c.existingText || '—'}</p>
                              </div>
                              <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-[10px] uppercase mb-0.5 text-blue-600">{t('admin.importSet.imported') || 'Imported'}</p>
                                <p style={{ color: 'var(--text-primary)' }}>{c.importedText || '—'}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => resolveConflict(item.q.order, c.lang, 'keep')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${decision === 'keep' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                              >
                                {t('admin.importSet.keepExisting') || 'Keep existing'}
                              </button>
                              <button
                                onClick={() => resolveConflict(item.q.order, c.lang, 'overwrite')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${decision === 'overwrite' ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-400'}`}
                                style={{ borderColor: 'var(--border)', color: decision === 'overwrite' ? 'white' : 'var(--text-secondary)' }}
                              >
                                {t('admin.importSet.overwrite') || 'Use imported'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
                {unresolvedCount > 0 && (
                  <p className="text-xs mt-3 text-amber-700 dark:text-amber-300">
                    {t('admin.importSet.unresolved', { count: unresolvedCount }) || `${unresolvedCount} conflict(s) unresolved — existing values will be kept.`}
                  </p>
                )}
              </div>
            )}

            {/* Action summary */}
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              {Object.entries(ACTION_META).map(([key, meta]) => {
                const n = plan.filter((p) => p.action === key).length
                if (!n) return null
                return (
                  <span key={key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${meta.cls}`}>
                    {n} {meta.label}
                  </span>
                )
              })}
            </div>

            {/* Editable questions */}
            <div className="max-h-[480px] overflow-y-auto pr-1 space-y-2">
              {plan.map((item, i) => {
                const isConflict = item.action === 'conflict'
                return (
                  <div
                    key={`${item.q.order}-${i}`}
                    className="rounded-lg border p-3"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: isConflict ? '#ef4444' : 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-semibold px-1 py-1" style={{ color: 'var(--text-muted)' }}>
                        #{item.q.order}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ACTION_META[item.action].cls}`}>
                        {ACTION_META[item.action].label}
                      </span>
                      {item.action === 'skip' && item.existing?.correctAnswer != null && (
                        <span className="text-[10px] text-green-600 font-medium">✓ answer already set</span>
                      )}
                      {item.action === 'create' && item.q.correctAnswer != null && (
                        <span className="text-[10px] text-green-600 font-medium">✓ answer from Word</span>
                      )}
                      {item.action === 'create' && item.q.correctAnswer == null && (
                        <span className="text-[10px] text-amber-600 font-medium">{t('admin.importSet.needsQuizBadge') || 'answer via quiz'}</span>
                      )}
                    </div>
                    {LANGS.map((lang) => (
                      <LangField
                        key={lang}
                        lang={lang}
                        value={item.q[langKey(lang)] || ''}
                        onChange={(v) => updateParsedQuestion(i, lang, v)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 4 — import */}
        {canImport && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              4. {t('admin.importSet.importStep') || 'Import'}
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('admin.importSet.importHint') ||
                'Word questions are saved with their color-coded answers. PDF questions are saved WITHOUT answers — you set them in the answer-key quiz afterwards. Existing answers are never overwritten with null.'}
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('admin.importSet.importing') || 'Importing…'}
                </>
              ) : (
                <>
                  <DocumentArrowUpIcon className="w-5 h-5" />
                  {t('admin.importSet.importQuestions', { count: plan.filter((p) => p.action !== 'skip').length }) ||
                    `Import ${plan.filter((p) => p.action !== 'skip').length} questions`}
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="rounded-xl p-5 border border-green-200" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-700">{t('admin.importSet.importComplete') || 'Import complete!'}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {results.failed.length > 0
                    ? (t('admin.pdfImport.partialComplete', { count: results.failed.length }) || `${results.failed.length} question(s) failed`)
                    : (t('admin.pdfImport.allComplete') || 'All questions imported')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4 text-center text-sm">
              <ResultStat label={t('admin.import.created') || 'Created'} value={results.created} tone="green" />
              <ResultStat label={t('admin.import.updated') || 'Updated'} value={results.updated} tone="blue" />
              <ResultStat label={t('admin.import.skipped') || 'Skipped'} value={results.skipped} tone="gray" />
              <ResultStat label={t('admin.importSet.conflictsKept') || 'Conflicts kept'} value={results.conflictsSkipped} tone="amber" />
            </div>

            {results.failed.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-200 p-3 space-y-1.5">
                {results.failed.map((f, i) => (
                  <p key={i} className="text-xs text-red-600">#{f.order} — {f.error}</p>
                ))}
              </div>
            )}

            {needsQuiz > 0 ? (
              <button
                onClick={openAnswerKey}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 mb-2 flex items-center justify-center gap-2"
              >
                <AcademicCapIcon className="w-5 h-5" />
                {t('admin.importSet.openAnswerKey', { count: needsQuiz }) || `Open answer-key quiz (${needsQuiz} unanswered)`}
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <div className="mb-2 p-3 rounded-lg text-center text-sm" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                ✅ {t('admin.importSet.answersAllSet') || 'All questions already have answers — no quiz needed.'}
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-2 rounded-lg text-sm border transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
            >
              {t('admin.import.importAnother') || 'Import another file'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small presentational helpers ───────────────────────────────────────────

function Stat({ label, value, tone }) {
  const colors = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    gray: 'text-gray-500 dark:text-gray-400',
  }
  return (
    <div className="rounded-lg p-2.5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div className={`text-xl font-bold ${colors[tone] || colors.gray}`}>{value ?? '—'}</div>
      <div className="text-[10px] font-medium leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function ResultStat({ label, value, tone }) {
  const colors = { green: 'text-green-600', blue: 'text-blue-600', gray: 'text-gray-500', amber: 'text-amber-600', red: 'text-red-600' }
  return (
    <div className="rounded-lg p-2.5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div className={`text-xl font-bold ${colors[tone] || colors.gray}`}>{value}</div>
      <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function LangField({ lang, value, onChange }) {
  const label = lang === 'en' ? '🇬🇧 EN' : lang === 'lv' ? '🇱🇻 LV' : '🇷🇺 RU'
  return (
    <div className="flex items-start gap-2 mb-1.5">
      <span className="w-14 flex-shrink-0 text-xs font-semibold pt-2" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <textarea
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 border rounded-md px-2 py-1.5 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 ${!value.trim() ? 'border-red-300' : ''}`}
        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

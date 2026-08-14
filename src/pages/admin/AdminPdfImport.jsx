// AdminPdfImport.jsx — import multilingual True/False questions from a PDF.
//
// Flow (never combined into one step):
//   1. Upload + parse (coordinates, three-language columns, question numbers)
//   2. Preview & validation — the admin corrects parsing problems inline
//   3. Course + dedup plan — new / skip / update / conflict per question
//   4. Import — creates questions WITHOUT answers (answerStatus = missing)
//   5. Hand off to the answer-key quiz (/admin/import-quiz) where the admin
//      assigns the official True/False answers manually.
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api, { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import FileDropzone from '../../components/FileDropzone'
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'
import { parsePdfQuestions, normalizeSourceKey } from '../../utils/pdfQuestionParser'
import {
  fetchAllExistingQuestions,
  planQuestionActions,
} from '../../utils/questionImport'

const ACTION_META = {
  create: { label: 'New', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  skip: { label: 'Skip (identical)', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  update: { label: 'Update translation', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  conflict: { label: 'Conflict — review', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

export default function AdminPdfImport() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [questions, setQuestions] = useState([])       // editable parsed questions
  const [report, setReport] = useState(null)
  const [typeDetected, setTypeDetected] = useState(true)
  const [sourceKey, setSourceKey] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState(0)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [existing, setExisting] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)          // { created, updated, skipped, conflicts, failed: [] }
  const [error, setError] = useState('')

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=titleLv:asc&pagination[page]=1&pagination[pageSize]=200').then(r => r.data.data),
  })

  const handleFileChange = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setQuestions([])
    setReport(null)
    setResults(null)
    setParsing(true)
    setParseProgress(0)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'

      const result = await parsePdfQuestions(pdfjsLib, f, {
        onProgress: p => setParseProgress(p.page / p.total),
      })
      setQuestions(result.questions)
      setReport(result.report)
      setTypeDetected(result.typeDetected)
      setSourceKey(normalizeSourceKey(f.name))
      setParseProgress(1)
    } catch (err) {
      console.error('Parse failed:', err)
      setError('Failed to parse PDF: ' + err.message)
    } finally {
      setParsing(false)
    }
  }

  // Load existing questions for the chosen course (for the dedup plan).
  const handleCourseChange = async (courseId) => {
    setSelectedCourse(courseId)
    setExisting([])
    if (!courseId) return
    try {
      setExisting(await fetchAllExistingQuestions(courseId))
    } catch (err) {
      console.error('Failed to fetch existing questions:', err)
      setError('Failed to load existing questions for dedup check.')
    }
  }

  // Dedup plan — recomputed whenever questions / course / source key change.
  const plan = useMemo(() => {
    if (!selectedCourse || questions.length === 0) return null
    return planQuestionActions(questions, existing, {
      courseId: selectedCourse,
      sourceDocumentKey: sourceKey,
    })
  }, [questions, existing, selectedCourse, sourceKey])

  const stats = useMemo(() => {
    if (!questions.length) return null
    const missingEn = questions.filter(q => !(q.textEn || '').trim()).map(q => q.order)
    const missingLv = questions.filter(q => !(q.textLv || '').trim()).map(q => q.order)
    const missingRu = questions.filter(q => !(q.textRu || '').trim()).map(q => q.order)
    return {
      total: questions.length,
      completeTranslations: questions.filter(q => (q.textEn || '').trim() && (q.textLv || '').trim() && (q.textRu || '').trim()).length,
      missingEn,
      missingLv,
      missingRu,
      answersMissing: questions.length,
      firstOrder: questions[0]?.order ?? null,
      lastOrder: questions[questions.length - 1]?.order ?? null,
    }
  }, [questions])

  const updateQuestion = (index, field, value) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)))
  }

  const hasParseProblems =
    stats?.missingEn.length > 0 || stats?.missingLv.length > 0 || stats?.missingRu.length > 0 ||
    report?.duplicateOrders?.length > 0 || report?.malformedRows?.length > 0

  const handleImport = async () => {
    if (!selectedCourse || !plan || importing) return
    setImporting(true)
    setError('')
    setResults(null)

    const out = { created: 0, updated: 0, skipped: 0, conflicts: 0, failed: [] }
    const fileName = file?.name || 'document.pdf'

    for (const item of plan) {
      const q = item.q
      try {
        if (item.action === 'create') {
          await api.post('/questions', {
            data: {
              textEn: q.textEn || null,
              textLv: q.textLv || null,
              textRu: q.textRu || null,
              type: 'yes_no',
              optionsEn: ['true', 'false'],
              optionsLv: ['true', 'false'],
              optionsRu: ['true', 'false'],
              // Never inferred from the PDF — the admin fills the answer key.
              correctAnswer: null,
              answerStatus: 'missing',
              order: q.order,
              course: selectedCourse,
              sourceFile: fileName,
              sourceDocumentKey: sourceKey,
              sourceMode: 'pdf',
              sourceLang: 'en',
            },
          })
          out.created++
        } else if (item.action === 'update') {
          await api.put(`/questions/${item.existing.documentId}`, {
            data: {
              ...item.patch,
              sourceFile: fileName,
              sourceDocumentKey: sourceKey,
            },
          })
          out.updated++
        } else if (item.action === 'skip') {
          out.skipped++
        } else {
          out.conflicts++
        }
      } catch (err) {
        out.failed.push({
          order: q.order,
          error: err.response?.data?.error?.message || err.message,
        })
      }
    }

    setResults(out)
    setImporting(false)
  }

  const openAnswerKey = () => {
    navigate(`/admin/import-quiz?courseId=${encodeURIComponent(selectedCourse)}&sourceFile=${encodeURIComponent(file?.name || '')}`)
  }

  const reset = () => {
    setFile(null); setQuestions([]); setReport(null); setResults(null)
    setSelectedCourse(''); setExisting([]); setSourceKey(''); setError('')
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">{t('admin.pdfImport.title')}</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('admin.pdfImport.description')}
      </p>

      <div className="space-y-4">
        {/* Step 1: Upload */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>1. {t('admin.pdfImport.uploadStep')}</h2>
          <FileDropzone
            icon={<DocumentArrowUpIcon className="w-7 h-7" />}
            title={(dragging) =>
              file ? file.name : dragging
                ? 'Drop the PDF here'
                : t('admin.pdfImport.selectFile')
            }
            hint={t('admin.pdfImport.fileHint')}
            showBrowseHint={!file}
            accept=".pdf"
            ariaLabel="Upload multilingual question PDF"
            className="py-10"
            onFiles={(files) => { const f = files[0]; if (f) handleFileChange({ target: { files: [f] } }) }}
          />

          {parsing && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {t('admin.pdfImport.parsing')}
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div className="h-1.5 rounded-full bg-blue-500 transition-all duration-200" style={{ width: `${Math.round(parseProgress * 100)}%` }} />
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        {/* Step 2: Preview & validation */}
        {questions.length > 0 && !results && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              2. {t('admin.pdfImport.previewStep')} ({stats?.total})
            </h2>

            {/* Type detection */}
            {!typeDetected && (
              <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <span>{t('admin.pdfImport.typeNotDetected')}</span>
              </div>
            )}

            {/* Validation stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center text-sm">
              <Stat label={t('admin.pdfImport.statDetected')} value={stats?.total} tone="blue" />
              <Stat label={t('admin.pdfImport.statComplete')} value={stats?.completeTranslations} tone="green" />
              <Stat label={t('admin.pdfImport.statMissingEn')} value={stats?.missingEn.length} tone={stats?.missingEn.length ? 'red' : 'green'} />
              <Stat label={t('admin.pdfImport.statMissingLv')} value={stats?.missingLv.length} tone={stats?.missingLv.length ? 'red' : 'green'} />
              <Stat label={t('admin.pdfImport.statMissingRu')} value={stats?.missingRu.length} tone={stats?.missingRu.length ? 'red' : 'green'} />
              <Stat label={t('admin.pdfImport.statAnswersMissing')} value={stats?.answersMissing} tone="amber" />
              <Stat label={t('admin.pdfImport.statDuplicate')} value={report?.duplicateOrders?.length || 0} tone={report?.duplicateOrders?.length ? 'red' : 'gray'} />
              <Stat label={t('admin.pdfImport.statMalformed')} value={report?.malformedRows?.length || 0} tone={report?.malformedRows?.length ? 'red' : 'gray'} />
            </div>

            {hasParseProblems && (
              <div className="mb-3 p-3 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                {stats?.missingEn.length > 0 && <p className="text-red-600">⚠ {t('admin.pdfImport.missingEnList', { list: stats.missingEn.slice(0, 10).join(', ') })}</p>}
                {stats?.missingLv.length > 0 && <p className="text-red-600">⚠ {t('admin.pdfImport.missingLvList', { list: stats.missingLv.slice(0, 10).join(', ') })}</p>}
                {stats?.missingRu.length > 0 && <p className="text-red-600">⚠ {t('admin.pdfImport.missingRuList', { list: stats.missingRu.slice(0, 10).join(', ') })}</p>}
                {report?.duplicateOrders?.length > 0 && <p className="text-red-600">⚠ {t('admin.pdfImport.duplicateList', { list: report.duplicateOrders.join(', ') })}</p>}
                {report?.lowConfidencePages?.length > 0 && <p className="text-amber-600">⚠ {t('admin.pdfImport.lowConfidencePages', { list: report.lowConfidencePages.join(', ') })}</p>}
              </div>
            )}

            {/* Source document key (dedup identity part) */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                {t('admin.pdfImport.sourceKeyLabel')}
              </label>
              <input
                type="text"
                value={sourceKey}
                onChange={e => setSourceKey(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {t('admin.pdfImport.sourceKeyHint')}
              </p>
            </div>

            {/* Malformed rows */}
            {report?.malformedRows?.length > 0 && (
              <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1.5">{t('admin.pdfImport.malformedTitle', { count: report.malformedRows.length })}</p>
                {report.malformedRows.slice(0, 10).map((r, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-300">p.{r.page} — {r.reason}: {r.text.slice(0, 90)}</p>
                ))}
              </div>
            )}

            {/* Editable question review */}
            <div className="max-h-[480px] overflow-y-auto pr-1 space-y-2">
              {questions.map((q, i) => {
                const duplicate = q.warnings?.includes('duplicate-number')
                return (
                  <div key={q.order + '-' + i} className="rounded-lg border p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: duplicate ? '#ef4444' : 'var(--border)' }}>
                    <div className="flex items-start gap-2 mb-2">
                      <input
                        type="number"
                        value={q.order}
                        onChange={e => updateQuestion(i, 'order', Number(e.target.value))}
                        className="w-16 border rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        aria-label="Question order"
                      />
                      {duplicate && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          {t('admin.pdfImport.duplicateBadge')}
                        </span>
                      )}
                    </div>
                    <LangField lang="🇬🇧 EN" value={q.textEn || ''} invalid={!(q.textEn || '').trim()} onChange={v => updateQuestion(i, 'textEn', v)} placeholder={t('admin.pdfImport.missingText')} />
                    <LangField lang="🇱🇻 LV" value={q.textLv || ''} invalid={!(q.textLv || '').trim()} onChange={v => updateQuestion(i, 'textLv', v)} placeholder={t('admin.pdfImport.missingText')} />
                    <LangField lang="🇷🇺 RU" value={q.textRu || ''} invalid={!(q.textRu || '').trim()} onChange={v => updateQuestion(i, 'textRu', v)} placeholder={t('admin.pdfImport.missingText')} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Course + dedup plan */}
        {questions.length > 0 && !results && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>3. {t('admin.pdfImport.courseStep')}</h2>
            <select
              value={selectedCourse}
              onChange={e => handleCourseChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">{t('admin.pdfImport.selectCourse')}</option>
              {courses?.map(c => (
                <option key={c.id} value={c.documentId}>{getLocalizedField(c, i18n.language, 'title') || c.titleLv}</option>
              ))}
            </select>

            {plan && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2 text-xs mb-3">
                  {Object.entries(ACTION_META).map(([key, meta]) => {
                    const n = plan.filter(p => p.action === key).length
                    if (!n) return null
                    return (
                      <span key={key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${meta.cls}`}>
                        {n} {meta.label}
                      </span>
                    )
                  })}
                </div>

                {plan.some(p => p.action === 'conflict') && (
                  <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">
                    {t('admin.pdfImport.conflictHint')}
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5">
                  {plan.map((item, i) => {
                    const meta = ACTION_META[item.action]
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded font-medium ${meta.cls}`}>{item.action}</span>
                        <span className="font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>#{item.q.order}</span>
                        <span className="truncate">{(item.q.textEn || item.q.textLv || '')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Import */}
        {plan && !results && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>4. {t('admin.pdfImport.importStep')}</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('admin.pdfImport.importHint')}
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('admin.pdfImport.importing')}
                </>
              ) : (
                <>
                  <DocumentArrowUpIcon className="w-5 h-5" />
                  {t('admin.pdfImport.importQuestions', { count: plan.filter(p => p.action !== 'skip' && p.action !== 'conflict').length })}
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
                <h3 className="font-bold text-green-700">{t('admin.pdfImport.importComplete')}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {results.failed.length > 0
                    ? t('admin.pdfImport.partialComplete', { count: results.failed.length })
                    : t('admin.pdfImport.allComplete')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4 text-center text-sm">
              <ResultStat label={t('admin.import.created')} value={results.created} tone="green" />
              <ResultStat label={t('admin.import.updated')} value={results.updated} tone="blue" />
              <ResultStat label={t('admin.import.skipped')} value={results.skipped} tone="gray" />
              <ResultStat label={t('admin.pdfImport.conflicts')} value={results.conflicts} tone="red" />
            </div>

            {results.failed.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-200 p-3 space-y-1.5">
                {results.failed.map((f, i) => (
                  <p key={i} className="text-xs text-red-600">#{f.order} — {f.error}</p>
                ))}
              </div>
            )}

            <button
              onClick={openAnswerKey}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 mb-2 flex items-center justify-center gap-2"
            >
              <AcademicCapIcon className="w-5 h-5" />
              {t('admin.pdfImport.openAnswerKey')}
              <ArrowRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={reset}
              className="w-full py-2 rounded-lg text-sm border transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
            >
              {t('admin.import.importAnother')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

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
  const colors = { green: 'text-green-600', blue: 'text-blue-600', gray: 'text-gray-500', red: 'text-red-600' }
  return (
    <div className="rounded-lg p-2.5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div className={`text-xl font-bold ${colors[tone] || colors.gray}`}>{value}</div>
      <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function LangField({ lang, value, invalid, onChange, placeholder }) {
  return (
    <div className="flex items-start gap-2 mb-1.5">
      <span className="w-14 flex-shrink-0 text-xs font-semibold pt-2" style={{ color: 'var(--text-muted)' }}>{lang}</span>
      <textarea
        rows={1}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 border rounded-md px-2 py-1.5 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 ${invalid ? 'border-red-400' : ''}`}
        style={{ backgroundColor: 'var(--input-bg)', borderColor: invalid ? undefined : 'var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

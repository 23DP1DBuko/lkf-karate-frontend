import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/strapi'
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getLocalizedField } from '../../api/strapi'
import FileDropzone from '../../components/FileDropzone'
import { fetchAllExistingQuestions, findExistingQuestion, preserveCorrectAnswer } from '../../utils/questionImport'

async function parseDocx(file) {
  const JSZip = (await import('jszip')).default
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const xml = await zip.file('word/document.xml').async('string')

  const paragraphRegex = /<w:p[ >][\s\S]*?<\/w:p>/g
  const colorRegex = /<w:color w:val="([^"]+)"/
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  const numberRegex = /^(\d+)[.)]\s*/

  const questions = []
  const paragraphs = xml.match(paragraphRegex) || []

  for (const para of paragraphs) {
    let text = ''
    let match
    while ((match = textRegex.exec(para)) !== null) text += match[1]
    textRegex.lastIndex = 0

    text = text.trim()
    if (!text || text.length < 5) continue

    const numMatch = text.match(numberRegex)
    if (!numMatch) continue

    const order = parseInt(numMatch[1])
    const cleanText = text.replace(numberRegex, '').trim()

    const colorMatch = para.match(colorRegex)
    if (!colorMatch) continue

    const color = colorMatch[1].toUpperCase()
    let answer = null
    if (color === '00B050') answer = 'true'
    else if (color === 'FF0000') answer = 'false'

    if (answer && cleanText) {
      questions.push({ order, text: cleanText, correctAnswer: answer })
    }
  }

  return questions
}

export default function AdminImport() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [importWithoutAnswers, setImportWithoutAnswers] = useState(false)
  const [file, setFile] = useState(null)
  const [questions, setQuestions] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [language, setLanguage] = useState('lv')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=titleLv:asc').then(r => r.data.data)
  })

  const handleFileChange = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setQuestions([])
    setResults(null)
    setParsing(true)
    try {
      const parsed = await parseDocx(f)
      setQuestions(parsed)
    } catch (err) {
      setError('Failed to parse: ' + err.message)
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (!selectedCourse || questions.length === 0) return
    setImporting(true)

    const stats = { created: 0, updated: 0, skipped: 0, failed: 0 }
    const langField = language === 'lv' ? 'textLv' : language === 'ru' ? 'textRu' : 'textEn'
    const sourceFileName = file?.name || 'unknown'
    // "Import without answers": collect the created questions so we can jump
    // straight into the True/False quiz after the import.
    const createdQuestionIds = []

    let existing = []
    try {
      existing = await fetchAllExistingQuestions(selectedCourse)
    } catch (e) {
      console.error('Failed to fetch existing', e)
    }

    for (const q of questions) {
      // Legacy identity: course + order (unchanged Word-importer behavior).
      const existingQ = findExistingQuestion(existing, { courseId: selectedCourse, order: q.order })

      try {
        if (!existingQ) {
          const res = await api.post('/questions', {
            data: {
              textLv: language === 'lv' ? q.text : null,
              textRu: language === 'ru' ? q.text : null,
              textEn: language === 'en' ? q.text : null,
              type: 'yes_no',
              optionsLv: ['true', 'false'],
              optionsRu: ['true', 'false'],
              optionsEn: ['true', 'false'],
              // "Import without answers": skip the parsed correctAnswer — it is
              // set afterwards via the True/False quick quiz.
              ...(importWithoutAnswers ? {} : { correctAnswer: q.correctAnswer }),
              answerStatus: importWithoutAnswers ? 'missing' : 'answered',
              order: q.order,
              course: selectedCourse,
              sourceLang: language,
              sourceFile: sourceFileName,
            }
          })
          stats.created++
          const created = res.data?.data
          if (created?.documentId) createdQuestionIds.push(created.documentId)
        } else {
          const existingLangText = existingQ[langField]
          // In "without answers" mode the parsed answer is ignored entirely —
          // existing answers are never touched here.
          const answerChanged = !importWithoutAnswers && existingQ.correctAnswer !== q.correctAnswer
          const langTextChanged = existingLangText !== q.text
          const answerPatch = importWithoutAnswers
            ? {}
            : answerChanged
              ? { correctAnswer: q.correctAnswer }
              : {}

          const updateData = preserveCorrectAnswer(existingQ, {
            [langField]: q.text,
            sourceFile: sourceFileName,
            ...answerPatch,
          })

          if (!existingLangText) {
            await api.put(`/questions/${existingQ.documentId}`, { data: updateData })
            stats.updated++
          } else if (!answerChanged && !langTextChanged) {
            stats.skipped++
          } else {
            await api.put(`/questions/${existingQ.documentId}`, { data: updateData })
            stats.updated++
          }
        }
      } catch (err) {
        console.error(`Failed q${q.order}:`, err.response?.data || err.message)
        stats.failed++
      }
    }

    setResults(stats)
    setImporting(false)

    // "Import without answers" → jump straight into the True/False quiz for
    // the newly created questions.
    if (importWithoutAnswers && createdQuestionIds.length > 0) {
      navigate(
        `/admin/import-quiz?courseId=${encodeURIComponent(selectedCourse)}&questionIds=${createdQuestionIds.join(',')}`
      )
    }
  }

  const trueCount = questions.filter(q => q.correctAnswer === 'true').length
  const falseCount = questions.filter(q => q.correctAnswer === 'false').length

  const canImport = selectedCourse && questions.length > 0

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">{t('admin.import.title') || 'Import Questions'}</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('admin.import.description') || 'Import yes/no questions from .docx. Green = true, Red = false.'}
      </p>

      <div className="space-y-4">
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>1. {t('admin.import.uploadStep') || 'Upload .docx file'}</h2>
          <FileDropzone
            icon={<DocumentArrowUpIcon className="w-7 h-7" />}
            title={(dragging) =>
              file
                ? file.name
                : dragging
                  ? 'Drop the .docx here'
                  : t('admin.import.selectFile') || 'Click to select .docx file'
            }
            hint={t('admin.import.fileHint') || 'Include year in filename e.g. Kata_2025.docx'}
            showBrowseHint={!file}
            accept=".docx"
            ariaLabel="Upload .docx file"
            onFiles={(files) => handleFileChange({ target: { files } })}
          />

          {parsing && (
            <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Parsing...
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          {questions.length > 0 && (
            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                ✅ {questions.length} questions (#{questions[0]?.order}–#{questions[questions.length - 1]?.order})
              </span>
              <span className="ml-3 text-sm text-green-600">✓ {trueCount}</span>
              <span className="ml-3 text-sm text-red-500">✗ {falseCount}</span>
            </div>
          )}
        </div>

        {questions.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>2. {t('admin.import.courseLangStep') || 'Course & Language'}</h2>
            <div className="space-y-3">
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">Select course</option>
                {courses?.map(c => (
                  <option key={c.id} value={c.documentId}>{getLocalizedField(c, i18n.language, 'title')}</option>
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
                    onClick={() => setLanguage(lang.code)}
                    className="flex-1 py-2 rounded-lg border text-sm font-medium transition"
                    style={{
                      backgroundColor: language === lang.code ? '#2563eb' : 'var(--bg-secondary)',
                      color: language === lang.code ? 'white' : 'var(--text-primary)',
                      borderColor: language === lang.code ? '#2563eb' : 'var(--border)',
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <p><strong style={{ color: 'var(--text-primary)' }}>Match key: course + order</strong></p>
                <p>🟢 New order number → <span className="text-green-600">create</span></p>
                <p>🔵 Same order, missing language → <span className="text-blue-500">attach translation</span></p>
                <p>🟡 Same order, answer changed → <span className="text-yellow-600">update answer</span></p>
                <p>⚪ Same order, same text, same answer → <span>skip</span></p>
              </div>
            </div>
          </div>
        )}

        {questions.length > 0 && selectedCourse && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>3. {t('admin.import.previewStep') || 'Preview & Import'}</h2>

            <div className="max-h-48 overflow-y-auto space-y-1.5 mb-4">
              {questions.slice(0, 15).map((q, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <span className="flex-shrink-0 text-xs font-mono w-8" style={{ color: 'var(--text-muted)' }}>
                    #{q.order}
                  </span>
                  <span className={`flex-shrink-0 font-bold text-xs mt-0.5 ${q.correctAnswer === 'true' ? 'text-green-600' : 'text-red-500'}`}>
                    {q.correctAnswer === 'true' ? 'T' : 'F'}
                  </span>
                  <span className="line-clamp-1" style={{ color: 'var(--text-primary)' }}>{q.text}</span>
                </div>
              ))}
              {questions.length > 15 && (
                <p className="text-center text-xs py-1" style={{ color: 'var(--text-muted)' }}>
                  + {questions.length - 15} more
                </p>
              )}
            </div>

            {results ? (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.import.complete') || 'Import complete'}</p>
                <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
                  <div className="p-2 rounded bg-green-100 text-green-700">
                    <div className="font-bold text-xl">{results.created}</div>
                    <div className="text-xs">{t('admin.import.created') || 'Created'}</div>
                  </div>
                  <div className="p-2 rounded bg-blue-100 text-blue-700">
                    <div className="font-bold text-xl">{results.updated}</div>
                    <div className="text-xs">{t('admin.import.updated') || 'Updated'}</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                    <div className="font-bold text-xl">{results.skipped}</div>
                    <div className="text-xs">{t('admin.import.skipped') || 'Skipped'}</div>
                  </div>
                  <div className="p-2 rounded bg-red-100 text-red-600">
                    <div className="font-bold text-xl">{results.failed}</div>
                    <div className="text-xs">{t('admin.import.failed') || 'Failed'}</div>
                  </div>
                </div>
                <button
                  onClick={() => { setResults(null); setFile(null); setQuestions([]); setSelectedCourse(''); setLanguage('lv') }}
                  className="w-full py-2 rounded-lg text-sm border transition"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
                >
                  {t('admin.import.importAnother') || 'Import another file'}
                </button>
              </div>
            ) : (
              <>
                {/* Optional: import without answers, then set True/False in a quick quiz */}
                <label
                  className="flex items-start gap-2.5 p-3 rounded-lg border mb-3 cursor-pointer transition hover:border-blue-400"
                  style={{
                    borderColor: importWithoutAnswers ? '#2563eb' : 'var(--border)',
                    backgroundColor: importWithoutAnswers ? 'rgba(37,99,235,0.06)' : 'var(--bg-secondary)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={importWithoutAnswers}
                    onChange={(e) => setImportWithoutAnswers(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
                  />
                  <span className="text-sm">
                    <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>
                      {t('admin.import.importWithoutAnswers') || 'Import without answers and open quiz to set True/False'}
                    </span>
                    <span className="text-xs block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {t('admin.import.importWithoutAnswersHint') || 'Questions will be imported without answers. You will immediately set True/False for each question in a quick quiz.'}
                    </span>
                  </span>
                </label>

                <button
                  onClick={handleImport}
                  disabled={importing || !canImport}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>{t('admin.import.importQuestions', { count: questions.length }) || `Import ${questions.length} questions`}</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
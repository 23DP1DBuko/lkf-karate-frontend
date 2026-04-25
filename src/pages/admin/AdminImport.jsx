import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/strapi'
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline'

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
    while ((match = textRegex.exec(para)) !== null) {
      text += match[1]
    }
    textRegex.lastIndex = 0

    text = text.trim()
    if (!text || text.length < 5) continue

    // Extract order number
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
      questions.push({ order, text: cleanText, type: 'yes_no', options: ['true', 'false'], correctAnswer: answer })
    }
  }

  return questions
}

// Extract year from filename e.g. "Kata_2024.docx" → "2024"
function extractYear(filename) {
  const match = filename.match(/20\d{2}/)
  return match ? match[0] : new Date().getFullYear().toString()
}

export default function AdminImport() {
  const [file, setFile] = useState(null)
  const [questions, setQuestions] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [language, setLanguage] = useState('lv')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=title:asc').then(r => r.data.data)
  })

  const handleFile = async (e) => {
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
    const year = extractYear(file?.name || '')
    const sourceFile = `${file?.name || 'unknown'} (${year})`
    const langField = language === 'lv' ? 'textLv' : language === 'ru' ? 'textRu' : 'textEn'

    // Fetch existing questions for this course
    let existing = []
    try {
      const res = await api.get(
        `/questions?filters[course][documentId][$eq]=${selectedCourse}&pagination[limit]=1000&sort=order:asc`
      )
      existing = res.data.data || []
    } catch (e) {
      console.error('Failed to fetch existing', e)
    }

    // Build order-based lookup: order → question
    const orderMap = {}
    for (const q of existing) {
      if (q.order) orderMap[q.order] = q
    }

    for (const q of questions) {
      const match = orderMap[q.order]

      try {
        if (!match) {
          // Create new question
          await api.post('/questions', {
            data: {
              text: q.text,
              textLv: language === 'lv' ? q.text : '',
              textEn: language === 'en' ? q.text : '',
              textRu: language === 'ru' ? q.text : '',
              type: q.type,
              options: q.options,
              correctAnswer: q.correctAnswer,
              order: q.order,
              course: selectedCourse,
              sourceLang: language,
              sourceFile,
            }
          })
          stats.created++
        } else {
          // Question exists — check what needs updating
          const needsLangUpdate = !match[langField] || match[langField] !== q.text
          const answerChanged = match.correctAnswer !== q.correctAnswer
          const isNewerFile = match.sourceFile !== sourceFile

          if (!needsLangUpdate && !answerChanged && !isNewerFile) {
            stats.skipped++
            continue
          }

          const updateData = {
            [langField]: q.text,
            sourceFile,
          }

          // Update primary text if this is the primary language
          if (language === 'lv' || !match.text) {
            updateData.text = q.text
          }

          // Always update answer if changed (newer file wins)
          if (answerChanged || isNewerFile) {
            updateData.correctAnswer = q.correctAnswer
          }

          await api.put(`/questions/${match.documentId}`, { data: updateData })
          stats.updated++
        }
      } catch (err) {
        console.error('Import error for q', q.order, err)
        stats.failed++
      }
    }

    setResults(stats)
    setImporting(false)
  }

  const trueCount = questions.filter(q => q.correctAnswer === 'true').length
  const falseCount = questions.filter(q => q.correctAnswer === 'false').length

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-blue-700 mb-2">Import Questions</h1>
      <p className="mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Import yes/no questions from .docx. Green = true, Red = false.
      </p>
      <p className="mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        Dedup by order number + course. Same order + new year = update answer. Translation = add language to existing.
      </p>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>1. Upload .docx file</h2>
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <DocumentArrowUpIcon className="w-10 h-10 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {file ? file.name : 'Click to select .docx file'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Include year in filename e.g. Kata_2025.docx for version tracking
            </p>
            <input ref={fileRef} type="file" accept=".docx" onChange={handleFile} className="hidden" />
          </div>

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
                ✅ {questions.length} questions (Q{questions[0]?.order}–Q{questions[questions.length-1]?.order})
              </span>
              <span className="ml-3 text-sm text-green-600">✓ {trueCount}</span>
              <span className="ml-3 text-sm text-red-500">✗ {falseCount}</span>
            </div>
          )}
        </div>

        {/* Step 2 */}
        {questions.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>2. Course & Language</h2>
            <div className="space-y-3">
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">Select course</option>
                {courses?.map(c => (
                  <option key={c.id} value={c.documentId}>{c.title}</option>
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

              {file && (
                <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <span>Year detected: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{extractYear(file.name)}</strong>
                  <span className="ml-2">• Source: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{file.name}</strong>
                </div>
              )}

              <div className="p-3 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <p><strong style={{ color: 'var(--text-primary)' }}>Dedup rules (by order number):</strong></p>
                <p>🟢 New order → <span className="text-green-600">create</span></p>
                <p>🔵 Same order, add translation → <span className="text-blue-500">update textLv/textEn/textRu</span></p>
                <p>🟡 Same order, newer file → <span className="text-yellow-600">update answer if changed</span></p>
                <p>⚪ Same order, same file, same answer → <span>skip</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {questions.length > 0 && selectedCourse && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>3. Preview & Import</h2>

            <div className="max-h-48 overflow-y-auto space-y-1.5 mb-4">
              {questions.slice(0, 15).map((q, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}>
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
                <p className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Import complete</p>
                <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
                  <div className="p-2 rounded bg-green-100 text-green-700">
                    <div className="font-bold text-xl">{results.created}</div>
                    <div className="text-xs">Created</div>
                  </div>
                  <div className="p-2 rounded bg-blue-100 text-blue-700">
                    <div className="font-bold text-xl">{results.updated}</div>
                    <div className="text-xs">Updated</div>
                  </div>
                  <div className="p-2 rounded text-gray-600" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <div className="font-bold text-xl">{results.skipped}</div>
                    <div className="text-xs">Skipped</div>
                  </div>
                  <div className="p-2 rounded bg-red-100 text-red-600">
                    <div className="font-bold text-xl">{results.failed}</div>
                    <div className="text-xs">Failed</div>
                  </div>
                </div>
                <button
                  onClick={() => { setResults(null); setFile(null); setQuestions([]) }}
                  className="w-full py-2 rounded-lg text-sm border transition"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
                >
                  Import another file
                </button>
              </div>
            ) : (
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : `Import ${questions.length} Questions → ${courses?.find(c => c.documentId === selectedCourse)?.title || ''}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
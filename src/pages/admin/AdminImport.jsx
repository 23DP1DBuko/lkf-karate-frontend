import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/strapi'
import { DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

async function parseDocx(file) {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  
  // We need to read colors - mammoth doesn't preserve them
  // So we use a different approach: read raw XML
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(arrayBuffer)
  const xml = await zip.file('word/document.xml').async('string')
  
  // Parse paragraphs with color info
  const paragraphRegex = /<w:p[ >][\s\S]*?<\/w:p>/g
  const colorRegex = /<w:color w:val="([^"]+)"/
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  
  const questions = []
  const paragraphs = xml.match(paragraphRegex) || []
  
  for (const para of paragraphs) {
    // Get all text
    let text = ''
    let match
    while ((match = textRegex.exec(para)) !== null) {
      text += match[1]
    }
    textRegex.lastIndex = 0
    
    text = text.trim().replace(/^\d+\.\s*/, '').trim()
    if (!text) continue
    
    // Get color
    const colorMatch = para.match(colorRegex)
    if (!colorMatch) continue
    
    const color = colorMatch[1].toUpperCase()
    let answer = null
    if (color === '00B050') answer = 'true'
    else if (color === 'FF0000') answer = 'false'
    
    if (answer) {
      questions.push({
        text,
        type: 'yes_no',
        options: ['true', 'false'],
        correctAnswer: answer,
      })
    }
  }
  
  return questions
}

export default function AdminImport() {
  const [file, setFile] = useState(null)
  const [questions, setQuestions] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
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
      setError('Failed to parse file: ' + err.message)
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (!selectedCourse || questions.length === 0) return
    setImporting(true)
    let success = 0
    let failed = 0

    for (const q of questions) {
      try {
        await api.post('/questions', {
          data: {
            ...q,
            course: selectedCourse,
          }
        })
        success++
      } catch {
        failed++
      }
    }

    setResults({ success, failed })
    setImporting(false)
  }

  const trueCount = questions.filter(q => q.correctAnswer === 'true').length
  const falseCount = questions.filter(q => q.correctAnswer === 'false').length

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-700 mb-2">Import Questions</h1>
      <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
        Import yes/no questions from a Word document (.docx). 
        Green text = true, Red text = false.
      </p>

      <div className="space-y-6">
        {/* Step 1 - Upload */}
        <div className="rounded-xl p-6 shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
            Step 1 — Upload Word Document
          </h2>
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <DocumentArrowUpIcon className="w-12 h-12 mx-auto mb-3 text-blue-500" />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {file ? file.name : 'Click to select .docx file'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Supports .docx files with colored yes/no questions
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {parsing && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Parsing document...
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {questions.length > 0 && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                ✅ Found {questions.length} questions
              </p>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">✓ True: {trueCount}</span>
                <span className="text-red-500">✗ False: {falseCount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2 - Select course */}
        {questions.length > 0 && (
          <div className="rounded-xl p-6 shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              Step 2 — Select Course
            </h2>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">Select course for these questions</option>
              {courses?.map(c => (
                <option key={c.id} value={c.documentId}>{c.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Step 3 - Preview */}
        {questions.length > 0 && selectedCourse && (
          <div className="rounded-xl p-6 shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
              Step 3 — Preview & Import
            </h2>

            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {questions.slice(0, 20).map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <span className={`flex-shrink-0 font-bold ${q.correctAnswer === 'true' ? 'text-green-600' : 'text-red-500'}`}>
                    {q.correctAnswer === 'true' ? '✓' : '✗'}
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{q.text}</span>
                </div>
              ))}
              {questions.length > 20 && (
                <p className="text-center text-sm py-2" style={{ color: 'var(--text-muted)' }}>
                  ... and {questions.length - 20} more questions
                </p>
              )}
            </div>

            {results ? (
              <div className={`p-4 rounded-lg ${results.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <p className="font-semibold text-green-700">
                  ✅ Import complete: {results.success} imported, {results.failed} failed
                </p>
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
                    Importing {questions.length} questions...
                  </>
                ) : (
                  `Import ${questions.length} Questions`
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/strapi'
import IconButton from '../../components/IconButton'
import { EyeIcon } from '@heroicons/react/24/outline'

function YearGroup({ year, attempts, onReview }) {
  const [open, setOpen] = useState(true)

  // Group by category
  const byCategory = { kata: [], kumite: [], secretary: [], other: [] }
  attempts.forEach(attempt => {
    const cat = attempt.exam?.course?.category || 'other'
    if (byCategory[cat]) byCategory[cat].push(attempt)
    else byCategory.other.push(attempt)
  })

  const categories = ['kata', 'kumite', 'secretary', 'other'].filter(
    cat => byCategory[cat].length > 0
  )

  return (
    <div className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      {/* Year header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left font-bold text-lg"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <span>📅 {year}</span>
        <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
          {open ? '▲' : '▼'} {attempts.length} attempts
        </span>
      </button>

      {open && (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {categories.map(cat => (
            <div key={cat}>
              <p className="px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                {cat === 'kata' ? '🥋 Kata' : cat === 'kumite' ? '🥊 Kumite' : cat === 'secretary' ? '📋 Secretary' : '📄 Other'}
              </p>
              <table className="w-full min-w-[600px]">
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Student</th>
                    <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Exam</th>
                    <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Score</th>
                    <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory[cat].map(attempt => (
                    <tr key={attempt.id} className="border-t hover:opacity-80 transition"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {attempt.user?.firstName} {attempt.user?.lastName}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          @{attempt.user?.username}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {attempt.exam?.title || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                          {attempt.score ?? '?'}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {attempt.submittedAt ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {attempt.passed ? 'Passed' : 'Failed'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {attempt.submittedAt
                          ? new Date(attempt.submittedAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <IconButton
                          icon={EyeIcon}
                          label="Review answers"
                          onClick={() => onReview(attempt)}
                          variant="default"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminExamResults() {
  const queryClient = useQueryClient()
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [manualScores, setManualScores] = useState({})
  const [search, setSearch] = useState('')

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['admin-attempts'],
    queryFn: () => api.get('/exam-attempts/all').then(r => {
      console.log('attempts[0].exam:', r.data.data?.[0]?.exam)
      return r.data.data
    }),
  })



  const filteredAttempts = attempts?.filter(attempt => {
    if (!search.trim()) return true
    const fullName = `${attempt.user?.firstName} ${attempt.user?.lastName}`.toLowerCase()
    const username = attempt.user?.username?.toLowerCase() || ''
    const examTitle = attempt.exam?.title?.toLowerCase() || ''
    const query = search.toLowerCase()
    return fullName.includes(query) || username.includes(query) || examTitle.includes(query)
  })

  const gradeMutation = useMutation({
    mutationFn: ({ attemptId, score, passed }) =>
      api.put(`/exam-attempts/grade/${attemptId}`, { score, passed }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-attempts'])
      setSelectedAttempt(null)
    }
  })

  const releaseMutation = useMutation({
    mutationFn: (examDocumentId) =>
      api.put(`/exams/${examDocumentId}`, { data: { showResults: true } }),
    onSuccess: () => queryClient.invalidateQueries(['admin-attempts'])
  })

  const handleGrade = (attempt) => {
    const questions = attempt.questions || []
    const answers = attempt.answers || {}
    let autoCorrect = 0

    questions.forEach(q => {
      if (q.type !== 'open_text') {
        const userAnswer = answers[q.id]
        if (userAnswer && String(userAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase()) {
          autoCorrect++
        }
      }
    })

    const openTextPoints = Object.values(manualScores).reduce((sum, val) => sum + (Number(val) || 0), 0)
    const totalPoints = autoCorrect + openTextPoints
    const score = Math.round((totalPoints / questions.length) * 100)
    const passed = score >= (attempt.exam?.passingScore || 70)

    gradeMutation.mutate({ attemptId: attempt.id, score, passed })
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>

  if (selectedAttempt) {
    const questions = selectedAttempt.questions || []
    const answers = selectedAttempt.answers || {}

    return (
      <div>
        <button
          onClick={() => { setSelectedAttempt(null); setManualScores({}) }}
          className="text-blue-600 hover:underline text-sm mb-4 block"
        >
          ← Back to Results
        </button>

        <h1 className="text-2xl font-bold text-blue-700 mb-1">
          {selectedAttempt.user?.firstName} {selectedAttempt.user?.lastName}
        </h1>
        <p className="text-gray-500 mb-6">
          @{selectedAttempt.user?.username} — {selectedAttempt.exam?.title}
        </p>

        <div className="space-y-4 mb-6">
          {questions.map((q, i) => {
            const userAnswer = answers[q.id]
            const isOpenText = q.type === 'open_text'
            const isCorrect = !isOpenText &&
              userAnswer &&
              String(userAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase()

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl shadow p-5 border-l-4 ${
                  isOpenText ? 'border-orange-400'
                  : isCorrect ? 'border-green-400'
                  : 'border-red-400'
                }`}
              >
                <p className="font-medium mb-2">
                  <span className="text-gray-400 mr-2">{i + 1}.</span>
                  {q.text}
                </p>

                {q.type === 'multiple_choice' || q.type === 'yes_no' ? (
                  <div className="space-y-1 text-sm">
                    <p>Student answer: <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {userAnswer || 'No answer'}
                    </span></p>
                    <p>Correct answer: <span className="text-green-600 font-medium">{q.correctAnswer}</span></p>
                    <span className={`text-xs px-2 py-1 rounded-full ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-500 mb-1">Student answer:</p>
                      <p className="text-sm">{userAnswer || 'No answer provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Award points (0 = incorrect, 1 = correct):
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setManualScores({ ...manualScores, [q.id]: 0 })}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                            manualScores[q.id] === 0
                              ? 'bg-red-500 text-white border-red-500'
                              : 'border-gray-300 hover:border-red-400'
                          }`}
                        >
                          ✗ Incorrect
                        </button>
                        <button
                          onClick={() => setManualScores({ ...manualScores, [q.id]: 1 })}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                            manualScores[q.id] === 1
                              ? 'bg-green-500 text-white border-green-500'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          ✓ Correct
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current score: <span className="font-bold text-blue-700">{selectedAttempt.score ?? '?'}%</span></p>
            <p className="text-xs text-gray-400">Open text questions graded: {Object.keys(manualScores).length}</p>
          </div>
          <button
            onClick={() => handleGrade(selectedAttempt)}
            disabled={gradeMutation.isPending}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {gradeMutation.isPending ? 'Saving...' : 'Save Grades'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Exam Results</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {filteredAttempts?.length} of {attempts?.length} attempts
          </p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, username or exam..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full md:w-96 border rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />

      {/* Release Results — only show unreleased exams */}
      {(() => {
        const exams = {}
        attempts?.forEach(a => {
          if (a.exam && !exams[a.exam.documentId]) {
            exams[a.exam.documentId] = a.exam
          }
        })
        const unreleased = Object.values(exams).filter(exam => !exam.showResults)
        if (unreleased.length === 0) return null
        return (
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Pending Release
            </p>
            {unreleased.map(exam => (
              <div key={exam.documentId}
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{exam.title}</p>
                <button
                  onClick={() => releaseMutation.mutate(exam.documentId)}
                  disabled={releaseMutation.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Release Results
                </button>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Grouped by year */}
      {(() => {
        // Group attempts by year
        const byYear = {}
        filteredAttempts?.forEach(attempt => {
          const year = attempt.submittedAt
            ? new Date(attempt.submittedAt).getFullYear()
            : 'In Progress'
          if (!byYear[year]) byYear[year] = []
          byYear[year].push(attempt)
        })

        const years = Object.keys(byYear).sort((a, b) => b - a)

        return years.map(year => (
          <YearGroup
            key={year}
            year={year}
            attempts={byYear[year]}
            onReview={(attempt) => { setSelectedAttempt(attempt); setManualScores({}) }}
          />
        ))
      })()}
    </div>
  )
}
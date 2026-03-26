import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/strapi'

export default function AdminExamResults() {
  const queryClient = useQueryClient()
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [manualScores, setManualScores] = useState({})
  const [search, setSearch] = useState('')

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['admin-attempts'],
    queryFn: () => api.get('/exam-attempts/all').then(r => r.data.data)
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
      api.put(`/exams/${examDocumentId}`, { data: { resultsReleased: true } }),
    onSuccess: () => queryClient.invalidateQueries(['admin-attempts'])
  })

  const handleGrade = (attempt) => {
    const questions = attempt.questions || []
    const answers = attempt.answers || {}
    let autoCorrect = 0
    let openTextCount = 0

    questions.forEach(q => {
      if (q.type === 'open_text') {
        openTextCount++
      } else {
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
      <h1 className="text-3xl font-bold text-blue-700 mb-2">Exam Results</h1>
      <p className="text-gray-500 mb-4">
        {filteredAttempts?.length} of {attempts?.length} attempts
      </p>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, username or exam..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-96 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Release Results per exam */}
      {(() => {
        const exams = {}
        attempts?.forEach(a => {
          if (a.exam && !exams[a.exam.documentId]) {
            exams[a.exam.documentId] = a.exam
          }
        })
        return Object.values(exams).map(exam => (
          <div key={exam.documentId} className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{exam.title}</p>
              <p className="text-sm text-gray-500">
                Results: {exam.showResults
                  ? '✅ Shown immediately'
                  : exam.resultsReleased
                    ? '✅ Released to students'
                    : '⏳ Not released yet'}
              </p>
            </div>
            {!exam.resultsReleased && !exam.showResults && (
              <button
                onClick={() => releaseMutation.mutate(exam.documentId)}
                disabled={releaseMutation.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Release Results
              </button>
            )}
          </div>
        ))
      })()}
      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Student</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Exam</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Score</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAttempts?.map(attempt => (
              <tr key={attempt.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium">{attempt.user?.firstName} {attempt.user?.lastName}</p>
                  <p className="text-xs text-gray-400">@{attempt.user?.username}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{attempt.exam?.title || '—'}</td>
                <td className="px-6 py-4">
                  <span className="font-bold">{attempt.score ?? '?'}%</span>
                </td>
                <td className="px-6 py-4">
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
                <td className="px-6 py-4 text-sm text-gray-500">
                  {attempt.submittedAt
                    ? new Date(attempt.submittedAt).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => { setSelectedAttempt(attempt); setManualScores({}) }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/strapi'
import MediaDisplay from '../../components/MediaDisplay'

export default function ExamPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showResults, setShowResults] = useState(true)
  const [completedExam, setCompletedExam] = useState(false)

  useEffect(() => {
    api.post('/exams/start', { examId: documentId })
      .then(res => {
        setAttempt(res.data.attemptId)
        setQuestions(res.data.questions || [])
        setTimeLeft(res.data.remainingSeconds || res.data.duration * 60)
        setShowResults(res.data.showResults === true)
        setLoading(false)
        })
      .catch(err => {
        const message = err.response?.data?.error?.message || 'Failed to start exam'
        if (message.toLowerCase().includes('already completed')) {
          setCompletedExam(true)
          setError('')
        } else {
          setError(message)
        }
        setLoading(false)
      })
  }, [documentId])

  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await api.post('/exams/submit', { attemptId: attempt, answers })

      navigate('/results', {
        state: {
          justSubmitted: {
            ...res.data,
            id: attempt,
            title: res.data.title || 'Exam',
            questions,
            answers,
            showResults: res.data.showResults === true,
          }
        }
      })
    } catch (err) {
      setError('Failed to submit exam: ' + JSON.stringify(err.response?.data?.error))
      setSubmitting(false)
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Starting exam...</p>
    </div>
  )

  if (completedExam) return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-blue-700 mb-2">Exam already completed</h1>
        <p className="text-gray-500 mb-6">
          You have already submitted this exam. You cannot start it again.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/results')}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Results
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 border px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )

  const allAnswered = questions.length > 0 && questions.every(q => {
    const value = answers[q.id]
    return value !== undefined && value !== null && String(value).trim() !== ''
  })

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-blue-700">Exam in Progress</h1>
          <div className={`text-2xl font-mono font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-gray-700'}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl shadow p-6">
              <p className="font-semibold mb-4">
                <span className="text-blue-600 mr-2">{index + 1}.</span>
                {q.text}
              </p>
              <MediaDisplay media={q.media} />

              {q.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {q.options?.map(option => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition
                        ${answers[q.id] === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={option}
                        checked={answers[q.id] === option}
                        onChange={() => setAnswers({ ...answers, [q.id]: option })}
                        className="accent-blue-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'yes_no' && (
                <div className="flex gap-4">
                  {['true', 'false'].map(val => (
                    <label
                      key={val}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg border cursor-pointer transition
                        ${answers[q.id] === val
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={val}
                        checked={answers[q.id] === val}
                        onChange={() => setAnswers({ ...answers, [q.id]: val })}
                        className="accent-blue-600"
                      />
                      {val === 'true' ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'open_text' && (
                <textarea
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Type your answer here..."
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-8 flex flex-col items-end gap-2">
          {!allAnswered && (
            <p className="text-sm text-red-500">Answer all questions before submitting the exam.</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
            title={!allAnswered ? 'Answer all questions first' : ''}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>

      </div>
    </div>
  )
}
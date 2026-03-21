import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/strapi'

export default function QuickQuiz() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [count, setCount] = useState('10')
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [courseTitle, setCourseTitle] = useState('')

  const handleStart = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/exams/quick-quiz', {
        courseDocumentId: documentId,
        count,
      })
      setQuestions(res.data.questions)
      setCourseTitle(res.data.courseTitle)
      setStarted(true)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to start quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const getScore = () => {
    let correct = 0
    questions.forEach(q => {
      if (String(answers[q.id]).toLowerCase() === String(q.correctAnswer).toLowerCase()) {
        correct++
      }
    })
    return { correct, total: questions.length, score: Math.round((correct / questions.length) * 100) }
  }

  if (!started) {
    return (
      <div className="max-w-lg mx-auto">
        <Link to={`/courses/${documentId}`} className="text-blue-600 hover:underline text-sm mb-4 block">
          ← Back to Course
        </Link>
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-2">Quick Quiz</h1>
          <p className="text-gray-500 mb-6">Test your knowledge with random questions</p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="mb-6">
            <p className="text-sm font-medium mb-3">How many questions?</p>
            <div className="flex gap-3 justify-center">
              {['10', '25', '50', 'all'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setCount(opt)}
                  className={`px-4 py-2 rounded-lg border font-medium text-sm transition ${
                    count === opt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 w-full"
          >
            {loading ? 'Loading...' : 'Start Quiz'}
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    const { correct, total, score } = getScore()
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="text-6xl mb-4">{score >= 70 ? '🎉' : '📚'}</div>
          <h1 className="text-2xl font-bold mb-2">{score >= 70 ? 'Great job!' : 'Keep studying!'}</h1>
          <div className="text-5xl font-bold text-blue-700 my-4">{score}%</div>
          <p className="text-gray-500 mb-6">{correct} out of {total} correct</p>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-8">
            <div
              className="h-3 rounded-full bg-blue-600 transition-all"
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Review answers */}
          <div className="text-left space-y-4 mb-6">
            {questions.map((q, i) => {
              const userAnswer = answers[q.id]
              const isCorrect = String(userAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase()
              return (
                <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-sm font-medium mb-1">{i + 1}. {q.text}</p>
                  <p className="text-xs text-gray-500">Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer || 'No answer'}</span></p>
                  {!isCorrect && <p className="text-xs text-green-600">Correct: {q.correctAnswer}</p>}
                </div>
              )
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStarted(false); setSubmitted(false); setAnswers({}) }}
              className="flex-1 border px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Try Again
            </button>
            <Link
              to={`/courses/${documentId}`}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">Quick Quiz — {courseTitle}</h1>
        <span className="text-sm text-gray-500">{Object.keys(answers).length}/{questions.length} answered</span>
      </div>

      <div className="space-y-6 mb-8">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-xl shadow p-6">
            <p className="font-semibold mb-4">
              <span className="text-blue-600 mr-2">{index + 1}.</span>
              {q.text}
            </p>

            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                {q.options?.map(option => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition
                      ${answers[q.id] === option ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
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
                      ${answers[q.id] === val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
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
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700"
        >
          Submit Quiz
        </button>
      </div>
    </div>
  )
}
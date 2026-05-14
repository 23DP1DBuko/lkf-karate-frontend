// quickquiz.jsx
import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../api/strapi'
import { mediaUrl } from '../../api/media'
import { useTranslation } from 'react-i18next'
import { getQuestionText, getLocalizedField } from '../../api/strapi'

function MediaDisplay({ media }) {
  if (!media) return null
  
  // Handle both array and single object
  const items = Array.isArray(media) ? media : [media]
  if (items.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {items.map((item, i) => {
        if (item.mime?.startsWith('image/')) {
          return (
            <img
              key={i}
              src={mediaUrl(item.url)}
              alt={item.alternativeText || 'Attached media'}
              className="w-full rounded-lg max-h-64 object-cover"
            />
          )
        }
        if (item.mime?.startsWith('video/')) {
          return (
            <video key={i} controls className="w-full rounded-lg max-h-64">
              <source src={mediaUrl(item.url)} type={item.mime} />
            </video>
          )
        }
        return null
      })}
    </div>
  )
}

export default function QuickQuiz() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [count, setCount] = useState('10')
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const { i18n } = useTranslation()

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
    const { correct, total, score } = getScore()

    navigate('/results', {
      state: {
        justSubmitted: {
          id: `quick-quiz-${Date.now()}`,
          title: `Quick Quiz — ${courseTitle}`,
          score,
          passed: score >= 70,
          showResults: true,
          questions,
          answers,
          correct,
          total,
          submittedAt: new Date().toISOString(),
        }
      }
    })
  }

  const getScore = () => {
    let correct = 0
    questions.forEach(q => {
      const userAnswer = answers[q.id] || answers[String(q.id)]
      const correctAnswer = q.correctAnswer
      if (userAnswer !== undefined && userAnswer !== null) {
        if (String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase()) {
          correct++
        }
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
              {getQuestionText(q, i18n.language)}
            </p>
            <MediaDisplay media={q.media} />

            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                {q.options?.map(option => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      answers[q.id] === option
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    style={{ color: answers[q.id] === option ? 'white' : 'var(--text-primary)' }}
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
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg border cursor-pointer transition ${
                      answers[q.id] === val
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    style={{ color: answers[q.id] === val ? 'white' : 'var(--text-primary)' }}
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
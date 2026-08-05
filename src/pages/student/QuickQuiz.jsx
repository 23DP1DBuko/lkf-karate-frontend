// quickquiz.jsx
import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../api/strapi'
import { mediaUrl } from '../../api/media'
import { useTranslation } from 'react-i18next'
import { getQuestionText } from '../../api/strapi'

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
  const { t, i18n } = useTranslation()

  // QuickQuiz.jsx
  const [attemptId, setAttemptId] = useState(null)

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
      setAttemptId(res.data.attemptId)   // <-- keep real attempt id
      setStarted(true)
    } catch (err) {
      setError(err.response?.data?.error?.message || t('quiz.failedToStart'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!attemptId) return

    await api.post('/exams/submit', {
      attemptId,
      answers,
    })

    navigate('/results', {
      state: {
        justSubmittedAttemptId: attemptId,
        justSubmitted: null,
      },
    })
  }

  const allAnswered = questions.length > 0 && questions.every(q => {
    const value = answers[q.id]
    return value !== undefined && value !== null && String(value).trim() !== ''
  })

  // getScoreResult can be uncommented if inline scoring display is needed
  // const getScoreResult = () => { ... }

  if (!started) {
    return (
      <div className="max-w-lg mx-auto">
        <Link to={`/courses/${documentId}`} className="text-blue-600 hover:underline text-sm mb-4 block">
          ← {t('quiz.backToCourse')}
        </Link>
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="text-4xl sm:text-5xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-2">{t('quiz.title')}</h1>
          <p className="text-gray-500 mb-6">{t('quiz.subtitle')}</p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="mb-6">
            <p className="text-sm font-medium mb-3">{t('quiz.howMany')}</p>
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
                  {opt === 'all' ? t('quiz.all') : opt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 w-full"
          >
            {loading ? t('quiz.loading') : t('quiz.start')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">Quick Quiz — {courseTitle}</h1>
        <span className="text-sm text-gray-500">{Object.keys(answers).length}/{questions.length} {t('quiz.answered')}</span>
      </div>

      <div className="space-y-6 mb-8">
        {questions.map((q, index) => (
          <div key={q.id} className="rounded-xl shadow p-5 sm:p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
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
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-gray-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                    style={{ color: answers[q.id] === option ? 'white' : 'var(--text-primary)' }}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={() => setAnswers({ ...answers, [q.id]: option })}
                      className="sr-only"
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
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-gray-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                    style={{ color: answers[q.id] === val ? 'white' : 'var(--text-primary)' }}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={val}
                      checked={answers[q.id] === val}
                      onChange={() => setAnswers({ ...answers, [q.id]: val })}
                      className="sr-only"
                    />
                    {val === 'true' ? t('exam.yes') : t('exam.no')}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'open_text' && (
            <textarea
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={t('exam.typeAnswer')}
                value={answers[q.id] || ''}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
            />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-end gap-2">
        {!allAnswered && (
          <p className="text-sm text-red-500">{t('quiz.submitDisabled')}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          title={!allAnswered ? t('quiz.submitDisabled') : ''}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('quiz.submit')}
        </button>
      </div>
    </div>
  )
}
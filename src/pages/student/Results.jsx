/* Results.jsx */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { SkeletonList } from '../../components/Skeleton'


export default function Results() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const location = useLocation()
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const justSubmitted = location.state?.justSubmitted || null
  const { data: attempts, isLoading } = useQuery({
  queryKey: ['attempts', user?.id],
  queryFn: () => api.get(`/exam-attempts?populate=exam&sort=createdAt:desc`).then(r => r.data.data),
})

  if (selectedAttempt) {
    const questions = selectedAttempt.questions || []
    const answers = selectedAttempt.answers || {}

    return (
      <div>
        <button
          onClick={() => setSelectedAttempt(null)}
          className="text-blue-600 hover:underline text-sm mb-4 block"
        >
          ← Back to Results
        </button>

        <h1 className="text-3xl font-bold text-blue-700 mb-2">
          {selectedAttempt.exam?.title || 'Exam'}
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          {selectedAttempt.score}% • {selectedAttempt.passed ? t('results.passed') : t('results.failed')}
        </p>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const userAnswer = answers[q.id]
            const isCorrect =
              q.type !== 'open_text' &&
              String(userAnswer || '').toLowerCase() === String(q.correctAnswer || '').toLowerCase()

            return (
              <div
                key={q.id || i}
                className="rounded-xl shadow p-5"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <p className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span> {q.text}
                </p>

                <div className="space-y-1 text-sm">
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Your answer:{' '}
                    <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {userAnswer || '—'}
                    </span>
                  </p>

                  <p style={{ color: 'var(--text-secondary)' }}>
                    Correct answer:{' '}
                    <span className="text-green-600 font-medium">
                      {q.correctAnswer || '—'}
                    </span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (isLoading) return (
    <div>
      <div className="h-8 rounded w-48 mb-2 animate-pulse" style={{ backgroundColor: 'var(--border)' }} />
      <div className="h-4 rounded w-32 mb-8 animate-pulse" style={{ backgroundColor: 'var(--border)' }} />
      <SkeletonList count={4} />
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-700 mb-2">{t('results.title')}</h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>{t('results.subtitle')}</p>

      {attempts?.length === 0 && (
        <div className="rounded-xl shadow p-8 text-center" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-5xl mb-4">📝</div>
          <p style={{ color: 'var(--text-muted)' }}>{t('results.noExams')}</p>
        </div>
      )}

      {justSubmitted && (
        <div className="rounded-xl shadow p-5 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {justSubmitted.title || t('results.title')}
          </h2>

          {justSubmitted.showResults ? (
            <div>
              <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                {justSubmitted.score}% • {justSubmitted.passed ? t('results.passed') : t('results.failed')}
              </p>
              <button
                onClick={() => setSelectedAttempt(justSubmitted)}
                className="text-blue-600 hover:underline text-sm"
              >
                View answers
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>
              Exam submitted. Results will appear here after the administrator releases them.
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {attempts?.map(attempt => {
          const released = attempt.exam?.showResults === true
          return (
            <div
              key={attempt.id}
              onClick={() => {
                if (released) setSelectedAttempt(attempt)
              }}
              className={`rounded-xl shadow p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                released ? 'cursor-pointer hover:opacity-80 transition' : ''
              }`}
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <div>
                <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{attempt.exam?.title || 'Exam'}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {attempt.submittedAt
                    ? new Date(attempt.submittedAt).toLocaleDateString()
                    : t('results.inProgress')}
                </p>
              </div>
              <div className="text-right">
                {attempt.submittedAt ? (
                  <>
                    <div className="text-3xl font-bold">
                      {released ? (
                        <span className={attempt.passed ? 'text-green-600' : 'text-red-600'}>
                          {attempt.score}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>?</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      released
                        ? attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {released ? (attempt.passed ? t('results.passed') : t('results.failed')) : t('results.pending')}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    {t('results.inProgress')}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
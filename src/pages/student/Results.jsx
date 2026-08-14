import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import api, { getQuestionText } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { SkeletonList } from '../../components/Skeleton'
import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon as TimeIcon,
} from '@heroicons/react/24/solid'
import {
  formatTimeSpent,
  getAttemptMeta,
  formatAnswerValue,
  canShowScoreAndReview,
  isAnswerCorrect,
} from '../../utils/attempts'

function SummaryCard({ attempt, onShowReview, t }) {
  const meta = getAttemptMeta(attempt, t)
  const Icon = meta.icon
  const timeSpent = formatTimeSpent(attempt?.timeSpentSeconds)

  const canShow = canShowScoreAndReview(attempt)
  const score =
    canShow && typeof attempt?.score === 'number' ? `${attempt.score}%` : '—'

  return (
    <div
      className={`rounded-2xl shadow-lg p-5 sm:p-6 border relative overflow-hidden ${meta.border}`}
      style={{ backgroundColor: 'var(--bg-card)' }}
    >

      <div className="flex items-start justify-between gap-4">
        {/* Left: icon + labels */}
        <div className="min-w-0 flex items-start gap-3 sm:gap-4 flex-1">
          <div className={`shrink-0 mt-0.5 ${meta.color}`}>
            <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>

          <div className="min-w-0">
            <p
              className="text-[11px] sm:text-xs uppercase tracking-[0.18em] mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {meta.typeLabel}
            </p>

            <h1
              className="text-lg sm:text-2xl lg:text-3xl font-bold leading-tight truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {meta.title}
            </h1>

            <div
              className="mt-2 sm:mt-3 flex items-center gap-1.5 text-xs sm:text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              <TimeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>
                {t('results.timeSpent') || 'Time spent'}: {timeSpent || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: score + tiny status + CTA */}
        <div className="text-right shrink-0 min-w-[52px]">
          <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight ${meta.scoreColor}`}>
            {score}
          </div>

          {meta.statusLabel ? (
            <p
              className="mt-0.5 text-[11px] sm:text-sm font-light capitalize"
              style={{ color: 'var(--text-muted)' }}
            >
              {meta.statusLabel}
            </p>
          ) : null}

          {canShow && onShowReview && (
            <button
              onClick={onShowReview}
              className="mt-2 sm:mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:underline whitespace-nowrap"
            >
              {t('results.showDetailedReview') || 'Show detailed review'} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Results() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const rawJustSubmitted = location.state?.justSubmitted || null
  const justSubmittedAttemptId = location.state?.justSubmittedAttemptId || null

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['attempts', user?.id],
    queryFn: () =>
      api
        .get('/exam-attempts?populate=exam,course&sort=createdAt:desc')
        .then(r => r.data.data),
    enabled: !!user?.id,
  })

  // from API
  const justSubmittedFromApi = useMemo(
    () =>
      (attempts || []).find(a => a.id === justSubmittedAttemptId) || null,
    [attempts, justSubmittedAttemptId],
  )

  // prefer API attempt (exam), otherwise use raw (quick quiz)
  const justSubmitted = justSubmittedFromApi || rawJustSubmitted

  // Auto-navigate to detailed review after submission if results are visible
  useEffect(() => {
    if (justSubmitted && canShowScoreAndReview(justSubmitted)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAttempt(justSubmitted);
    }
  }, [justSubmitted, setSelectedAttempt]);

  const inProgressAttempts = useMemo(
    () => (attempts || []).filter(a => !a.submittedAt),
    [attempts],
  )

  const submittedAttempts = useMemo(
    () => (attempts || []).filter(a => a.submittedAt),
    [attempts],
  )

  const justSubmittedId = justSubmitted?.id || null

  const submittedListAttempts = useMemo(
    () =>
      (submittedAttempts || []).filter(a =>
        justSubmittedId ? a.id !== justSubmittedId : true
      ),
    [submittedAttempts, justSubmittedId],
  )

  const selectedQuestions = selectedAttempt?.questions || []
  const selectedAnswers = selectedAttempt?.answers || {}

  const canShowSelected =
    selectedAttempt && canShowScoreAndReview(selectedAttempt)

  const activeAttempt = canShowSelected ? selectedAttempt : null

  if (isLoading) {
    return (
      <div>
        <div
          className="h-8 rounded w-48 mb-2 animate-pulse"
          style={{ backgroundColor: 'var(--border)' }}
        />
        <div
          className="h-4 rounded w-32 mb-8 animate-pulse"
          style={{ backgroundColor: 'var(--border)' }}
        />
        <SkeletonList count={4} />
      </div>
    )
  }

  // Detail page
  if (activeAttempt) {
    const timeSpent = formatTimeSpent(activeAttempt.timeSpentSeconds)

    return (
      <div>
        <button
          onClick={() => setSelectedAttempt(null)}
          className="text-blue-600 hover:underline text-sm mb-5 block"
        >
          ← {t('results.backToResults') || 'Back to results'}
        </button>

        <SummaryCard
          attempt={activeAttempt}
          onShowReview={null}
          t={t}
        />

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('results.detailedReview') || 'Detailed review'}
            </h2>
            {timeSpent && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('results.timeSpent') || 'Time spent'}: {timeSpent}
              </p>
            )}
          </div>

          {selectedQuestions.map((q, i) => {
            const userAnswer = selectedAnswers[q.id]
            // Multi-select multiple choice stores the expected set here
            const correctAnswers =
              q.type === 'multiple_choice' &&
              Array.isArray(q.correctAnswers) &&
              q.correctAnswers.length > 0
                ? q.correctAnswers
                : null
            const displayCorrect = correctAnswers || q.correctAnswer
            const isOpenText = q.type === 'open_text'

            // Open text has no automatic correct answer — an admin grades it
            // manually and the result is stored per question in manualGrades
            // (1 = correct, 0 = incorrect, missing = not reviewed yet).
            const openTextGrade =
              isOpenText && activeAttempt?.manualGrades
                ? (activeAttempt.manualGrades[q.id] ?? null)
                : null
            const awaitingReview = isOpenText && openTextGrade === null
            const isCorrect = isOpenText
              ? openTextGrade === 1
              : isAnswerCorrect(q, userAnswer)

            const pillColor = awaitingReview
              ? 'bg-orange-100 text-orange-700'
              : isCorrect
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'

            const answerColor = awaitingReview
              ? 'text-orange-600'
              : isCorrect
                ? 'text-green-600'
                : 'text-red-600'

            return (
              <div
                key={q.id || i}
                className="rounded-2xl shadow-lg p-5 border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`shrink-0 mt-1 flex h-9 w-9 items-center justify-center rounded-full font-semibold ${pillColor}`}
                  >
                    {i + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-base sm:text-lg font-semibold leading-relaxed"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {getQuestionText(q, i18n.language)}
                    </p>

                    {isOpenText ? (
                      <>
                        <p className={`mt-2 text-sm sm:text-base font-semibold ${answerColor}`}>
                          {awaitingReview
                            ? (t('results.openTextAwaitingReview') ||
                                'Awaiting review')
                            : isCorrect
                              ? (t('results.openTextGradedCorrect') ||
                                  'Graded as correct')
                              : (t('results.openTextGradedIncorrect') ||
                                  'Graded as incorrect')}
                        </p>

                        <p
                          className="mt-1 text-sm"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t('results.yourChoice') || 'Your answer'}:{' '}
                          <span className="font-semibold">
                            {formatAnswerValue(userAnswer, q, t)}
                          </span>
                        </p>

                        <p
                          className="mt-2 text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t('results.openTextNote') ||
                            'Open text answers are reviewed manually by an administrator.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={`mt-2 text-sm sm:text-base font-semibold ${answerColor}`}>
                          {t('results.correctChoice') || 'Correct answer'}:{' '}
                          {formatAnswerValue(displayCorrect, q, t)}
                        </p>

                        {!isCorrect && (
                          <p
                            className="mt-1 text-sm"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t('results.yourChoice') || 'Your answer'}:{' '}
                            <span className="font-semibold">
                              {formatAnswerValue(userAnswer, q, t)}
                            </span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // List page
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">
        {t('results.title') || 'Results'}
      </h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
        {t('results.subtitle') || 'Review your attempts and see how you did.'}
      </p>

      {inProgressAttempts.length === 0 &&
        submittedAttempts.length === 0 &&
        !justSubmitted && (
          <div
            className="rounded-2xl shadow-lg p-8 text-center border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="mb-4 inline-flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-14 h-14 sm:w-16 sm:h-16" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              {t('results.noExams') || 'No attempts yet.'}
            </p>
          </div>
        )}

      {justSubmitted && (
        <div className="mb-6">
          <SummaryCard
            attempt={justSubmitted}
            onShowReview={() => {
              if (canShowScoreAndReview(justSubmitted)) {
                setSelectedAttempt(justSubmitted)
              }
            }}
            t={t}
          />
        </div>
      )}

      <div className="space-y-4">
        {submittedListAttempts.map(attempt => {
          const released =
            attempt.submittedAt && canShowScoreAndReview(attempt)

          const meta = getAttemptMeta(attempt, t)
          const Icon = meta.icon
          const score =
            released && typeof attempt.score === 'number'
              ? `${attempt.score}%`
              : '—'
          const timeSpent = formatTimeSpent(attempt.timeSpentSeconds)

          return (
            <div
              key={attempt.id}
              onClick={() => {
                if (released) setSelectedAttempt(attempt)
              }}
              className={`rounded-2xl shadow-lg p-4 sm:p-5 flex items-start justify-between gap-3 border ${
                released ? 'cursor-pointer hover:opacity-80 transition' : ''
              } ${meta.border}`}
              style={{
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`shrink-0 mt-0.5 ${meta.color}`}>
                  <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>

                <div className="min-w-0">
                  <p
                    className="text-[11px] sm:text-xs uppercase tracking-[0.18em] mb-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {meta.typeLabel}
                  </p>

                  <h3
                    className="font-semibold text-sm sm:text-lg truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {meta.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                    <span
                      className="text-xs sm:text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleDateString()
                        : t('results.inProgress') || 'In progress'}
                    </span>

                    {timeSpent && (
                      <span
                        className="text-xs sm:text-sm flex items-center gap-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <TimeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>
                          {t('results.timeSpent') || 'Time spent'}: {timeSpent}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 min-w-[48px]">
                <div
                  className={`text-xl sm:text-3xl lg:text-4xl font-bold leading-tight ${meta.scoreColor}`}
                >
                  {score}
                </div>

                {meta.statusLabel && (
                  <p
                    className="mt-0.5 text-[11px] sm:text-sm font-light capitalize"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {released ? meta.statusLabel : ''}
                  </p>
                )}

                <div className="mt-2 text-[11px] sm:text-sm text-blue-600 font-medium whitespace-nowrap">
                  {released
                    ? (t('results.showDetailedReview') ||
                        'Show detailed review') + ' →'
                    : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
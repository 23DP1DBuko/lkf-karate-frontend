import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { SkeletonList } from '../../components/Skeleton'
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ClockIcon,
  PlusCircleIcon,
  ClockIcon as TimeIcon,
} from '@heroicons/react/24/solid'

function formatTimeSpent(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
    return null
  }

  const total = Math.max(0, Math.floor(Number(seconds)))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function getAttemptMeta(attempt, t) {
  const isQuickQuiz = !!attempt.course && !attempt.exam
  const isExam = !!attempt?.exam

  // Quick quiz: neutral blue
  if (isQuickQuiz) {
    return {
      kind: 'quickQuiz',
      typeLabel: t('results.quickQuiz') || 'Quick Quiz',
      title: attempt.course?.title || '—',
      icon: PlusCircleIcon,
      color: 'text-blue-500',
      border: 'border-blue-400',
      scoreColor: 'text-blue-500',
      statusLabel: '',
    }
  }

  // Exam, submitted
  if (isExam && attempt.submittedAt) {
    const canShowResults = attempt.exam?.showResults === true

    if (canShowResults && typeof attempt.score === 'number' && attempt.passed === true) {
      return {
        kind: 'passed',
        typeLabel: t('results.exam') || 'Exam',
        title: attempt.exam?.title || '—',
        icon: CheckCircleIcon,
        color: 'text-green-500',
        border: 'border-green-400',
        scoreColor: 'text-green-500',
        statusLabel: t('results.passed') || 'passed',
      }
    }

    if (canShowResults && typeof attempt.score === 'number' && attempt.passed === false) {
      return {
        kind: 'failed',
        typeLabel: t('results.exam') || 'Exam',
        title: attempt.exam?.title || '—',
        icon: XCircleIcon,
        color: 'text-red-500',
        border: 'border-red-400',
        scoreColor: 'text-red-500',
        statusLabel: t('results.failed') || 'failed',
      }
    }

    // Submitted exam, but results hidden
    return {
      kind: 'unreleased',
      typeLabel: t('results.exam') || 'Exam',
      title: attempt.exam?.title || '—',
      icon: QuestionMarkCircleIcon,
      color: 'text-gray-400',
      border: 'border-gray-500',
      scoreColor: 'text-gray-400',
      statusLabel: t('results.unreleased') || 'unreleased',
    }
  }

  // Fallback neutral
  return {
    kind: 'neutral',
    typeLabel: t('results.quickQuiz') || 'Quick Quiz',
    title: attempt.course?.title || '—',
    icon: PlusCircleIcon,
    color: 'text-blue-500',
    border: 'border-blue-400',
    scoreColor: 'text-blue-500',
    statusLabel: '',
  }
}

function formatAnswerValue(value, q) {
  if (value === undefined || value === null || value === '') return '—'

  if (q?.type === 'open_text') return String(value)

  if (typeof value === 'boolean') return value ? 'True' : 'False'

  const v = String(value).trim()
  if (v.toLowerCase() === 'true') return 'True'
  if (v.toLowerCase() === 'false') return 'False'

  return v
}

// Shared rule for “can we show score + review?”
function canShowScoreAndReview(attempt) {
  if (!attempt) return false
  const isQuickQuiz = !!attempt.course && !attempt.exam
  return (
    isQuickQuiz ||
    (attempt.exam && attempt.exam.showResults === true) ||
    attempt.showResults === true
  )
}

function SummaryCard({ attempt, onShowReview, t }) {
  const meta = getAttemptMeta(attempt, t)
  const Icon = meta.icon
  const timeSpent = formatTimeSpent(attempt?.timeSpentSeconds)

  const canShow = canShowScoreAndReview(attempt)
  const score =
    canShow && typeof attempt?.score === 'number' ? `${attempt.score}%` : '—'

  return (
    <div
      className={`rounded-2xl shadow-lg p-6 border ${meta.border}`}
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: icon + labels */}
        <div className="min-w-0 flex items-start gap-4">
          <div className={`shrink-0 mt-1 ${meta.color}`}>
            <Icon className="h-10 w-10" />
          </div>

          <div className="min-w-0">
            <p
              className="text-xs uppercase tracking-[0.22em] mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {meta.typeLabel}
            </p>

            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {meta.title}
            </h1>

            <div
              className="mt-4 flex items-center gap-2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              <TimeIcon className="h-4 w-4" />
              <span>
                {t('results.timeSpent') || 'Time spent'}: {timeSpent || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: score + tiny status + CTA */}
        <div className="sm:text-right">
          <div className={`text-5xl font-bold ${meta.scoreColor}`}>{score}</div>

          {meta.statusLabel ? (
            <p
              className="mt-1 text-sm font-light capitalize"
              style={{ color: 'var(--text-muted)' }}
            >
              {meta.statusLabel}
            </p>
          ) : null}

          {canShow && (
            <button
              onClick={onShowReview}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
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
  const { t } = useTranslation()
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

  const inProgressAttempts = useMemo(
    () => (attempts || []).filter(a => !a.submittedAt),
    [attempts],
  )

  const submittedAttempts = useMemo(
    () => (attempts || []).filter(a => a.submittedAt),
    [attempts],
  )

  // from API
  const justSubmittedFromApi = useMemo(
    () =>
      (attempts || []).find(a => a.id === justSubmittedAttemptId) || null,
    [attempts, justSubmittedAttemptId],
  )

  // prefer API attempt (exam), otherwise use raw (quick quiz)
  const justSubmitted = justSubmittedFromApi || rawJustSubmitted

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

  const isQuickQuizSelected =
    !!selectedAttempt?.course && !selectedAttempt?.exam

  const canShowSelected =
    selectedAttempt &&
    (
      isQuickQuizSelected ||                      // quick quiz always reviewable
      selectedAttempt.showResults === true ||
      selectedAttempt.exam?.showResults === true
    )

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
          onShowReview={() => {}}
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
            const correctAnswer = q.correctAnswer
            const isOpenText = q.type === 'open_text'
            const isCorrect =
              !isOpenText &&
              String(userAnswer ?? '').toLowerCase() ===
                String(correctAnswer ?? '').toLowerCase()

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
                  <div className="shrink-0 mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                    {i + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-base sm:text-lg font-semibold leading-relaxed"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {q.text}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div
                        className="rounded-xl p-4"
                        style={{ backgroundColor: 'rgba(148,163,184,0.10)' }}
                      >
                        <p
                          className="text-xs uppercase tracking-[0.18em] mb-2"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t('results.yourChoice') || 'Your choice'}
                        </p>
                        <p
                          className={`text-sm sm:text-base font-semibold ${
                            isCorrect ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isCorrect ? '✓ ' : '✕ '}
                          {formatAnswerValue(userAnswer, q)}
                        </p>
                      </div>

                      <div
                        className="rounded-xl p-4"
                        style={{ backgroundColor: 'rgba(34,197,94,0.08)' }}
                      >
                        <p
                          className="text-xs uppercase tracking-[0.18em] mb-2"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t('results.correctChoice') || 'Correct choice'}
                        </p>
                        <p className="text-sm sm:text-base font-semibold text-green-600">
                          ✓ {formatAnswerValue(correctAnswer, q)}
                        </p>
                      </div>
                    </div>

                    {isOpenText && (
                      <p
                        className="mt-3 text-sm"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {t('results.openTextNote') ||
                          'Open text answers are reviewed by the system based on the stored correct answer.'}
                      </p>
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
      <h1 className="text-3xl font-bold text-blue-700 mb-2">
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
            <div className="text-5xl mb-4">📝</div>
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
          const isQuickQuiz = !!attempt.course && !attempt.exam

          const released =
            attempt.submittedAt &&
            (
              isQuickQuiz ||
              attempt.exam?.showResults === true ||
              attempt.showResults === true
            )

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
              className={`rounded-2xl shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
                released ? 'cursor-pointer hover:opacity-80 transition' : ''
              } ${meta.border}`}
              style={{
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className={`shrink-0 mt-1 ${meta.color}`}>
                  <Icon className="h-8 w-8" />
                </div>

                <div className="min-w-0">
                  <p
                    className="text-xs uppercase tracking-[0.18em] mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {meta.typeLabel}
                  </p>

                  <h3
                    className="font-semibold text-lg sm:text-xl truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {meta.title}
                  </h3>

                  <p
                    className="text-sm mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {attempt.submittedAt
                      ? new Date(attempt.submittedAt).toLocaleDateString()
                      : t('results.inProgress') || 'In progress'}
                  </p>

                  {timeSpent && (
                    <p
                      className="text-sm mt-1 flex items-center gap-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <TimeIcon className="h-4 w-4" />
                      <span>
                        {t('results.timeSpent') || 'Time spent'}: {timeSpent}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-3xl sm:text-4xl font-bold ${meta.scoreColor}`}
                >
                  {score}
                </div>

                {meta.statusLabel && (
                  <p
                    className="mt-1 text-sm font-light capitalize"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {released ? meta.statusLabel : ''}
                  </p>
                )}

                <div className="mt-3 text-sm text-blue-600 font-medium">
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
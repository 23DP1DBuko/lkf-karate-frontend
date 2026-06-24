import {
    CheckCircleIcon,
    PlusCircleIcon,
    QuestionMarkCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/solid'
// Shared rule for “can we show score + review?”
export function canShowScoreAndReview(attempt) {
  if (!attempt) return false
  const isQuickQuiz = !!attempt.course && !attempt.exam
  return (
    isQuickQuiz ||
    (attempt.exam && attempt.exam.showResults === true) ||
    attempt.showResults === true
  )
}

export function formatAnswerValue(value, q, t) {
  if (value === undefined || value === null || value === '') return '—'

  // Open text stays as typed
  if (q?.type === 'open_text') return String(value)

  const yesLabel = t('exam.yes') || 'Yes'
  const noLabel = t('exam.no') || 'No'

  // Actual booleans
  if (typeof value === 'boolean') return value ? yesLabel : noLabel

  // String values that are "true"/"false"
  const v = String(value).trim()
  if (v.toLowerCase() === 'true') return yesLabel
  if (v.toLowerCase() === 'false') return noLabel

  return v
}

export function getAttemptMeta(attempt, t) {
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

export function formatTimeSpent(seconds) {
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

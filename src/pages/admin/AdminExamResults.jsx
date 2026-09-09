import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import api, { getLocalizedField } from '../../api/strapi'
import IconButton from '../../components/IconButton'
import QuestionReviewCard from '../../components/QuestionReviewCard'
import { formatTimeSpent, isAnswerCorrect } from '../../utils/attempts'
import {
  getAnswerFieldCount,
  getFieldGrades,
  getExpectedAnswer,
  getEffectiveFieldDecision,
  computeReviewTotals,
  normalizeOpenTextAnswer,
  setFieldGrade,
} from '../../utils/grading'
import { EyeIcon, MagnifyingGlassIcon, XMarkIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

function YearGroup({ year, attempts, onReview }) {
  const { t } = useTranslation()
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
          {open ? '▲' : '▼'} {attempts.length} {t('admin.results.attempts')}
        </span>
      </button>

      {open && (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {categories.map(cat => (
            <div key={cat}>
              <p className="px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                {cat === 'kata' ? t('admin.results.categoryKata') : cat === 'kumite' ? t('admin.results.categoryKumite') : cat === 'secretary' ? t('admin.results.categorySecretary') : t('admin.results.categoryOther')}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <tr>
                      <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.results.colStudent')}</th>
                      <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.results.colExam')}</th>
                      <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.results.colScore')}</th>
                      <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.results.colStatus')}</th>
                      <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.results.colDate')}</th>
                      <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.results.colActions')}</th>
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
                              {attempt.passed ? t('admin.results.passed') : t('admin.results.failed')}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
                              {t('admin.results.inProgress')}
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
                            label={t('admin.results.iconReview')}
                            onClick={() => onReview(attempt)}
                            variant="default"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminExamResults() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [manualGrades, setManualGrades] = useState({})
  const [decisionModal, setDecisionModal] = useState(null) // { questionDocumentId, fieldIndex, decision }
  const [reviewNotice, setReviewNotice] = useState(null) // { kind: 'saved'|'success'|'nochange'|'error', count? }
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [examsOnly, setExamsOnly] = useState(false)

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['admin-attempts'],
    queryFn: () => api.get('/exam-attempts/all').then(r => r.data.data),
  })

  const questionIds = useMemo(
    () => (selectedAttempt?.questions || []).map(q => q.id),
    [selectedAttempt]
  )

  // Current question-bank data for the attempt's questions — gives judges the
  // up-to-date expected answers + bank decisions (old snapshots lack them).
  const { data: bankQuestions = {} } = useQuery({
    queryKey: ['bank-questions', questionIds.join(',')],
    queryFn: async () => {
      if (questionIds.length === 0) return {}
      const res = await api.get('/questions', {
        params: {
          'filters[id][$in]': questionIds.join(','),
          'pagination[pageSize]': 100,
        },
      })
      const map = {}
      for (const q of res.data.data || []) map[q.id] = q
      return map
    },
    enabled: !!selectedAttempt && questionIds.length > 0,
  })

  // Exam-specific grading decisions ("used in this exam").
  const { data: examDecisions = [] } = useQuery({
    queryKey: ['exam-decisions', selectedAttempt?.exam?.documentId],
    queryFn: () =>
      api.get(`/exam-attempts/decisions/${selectedAttempt.exam.documentId}`).then(r => r.data.data || []),
    enabled: !!selectedAttempt?.exam?.documentId,
  })

  const decisionsMap = useMemo(() => {
    const map = {}
    for (const d of examDecisions) {
      const key = d.questionNumericId ?? d.questionId
      if (!map[key]) map[key] = {}
      map[key][d.fieldIndex] = d.decision
    }
    return map
  }, [examDecisions])

  const filteredAttempts = useMemo(() => {
    return attempts?.filter(attempt => {
      if (search.trim()) {
        const fullName = `${attempt.user?.firstName} ${attempt.user?.lastName}`.toLowerCase()
        const username = attempt.user?.username?.toLowerCase() || ''
        const examTitle = attempt.exam?.title?.toLowerCase() || ''
        const query = search.toLowerCase()
        if (!fullName.includes(query) && !username.includes(query) && !examTitle.includes(query)) {
          return false
        }
      }
      if (statusFilter === 'passed' && !(attempt.submittedAt && attempt.passed)) return false
      if (statusFilter === 'failed' && !(attempt.submittedAt && !attempt.passed)) return false
      if (statusFilter === 'in_progress' && attempt.submittedAt) return false
      if (examsOnly && !attempt.exam) return false
      return true
    })
  }, [attempts, search, statusFilter, examsOnly])

  const gradeMutation = useMutation({
    mutationFn: ({ attemptId, manualGrades: mg }) =>
      api.put(`/exam-attempts/grade/${attemptId}`, { manualGrades: mg }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-attempts'])
      // Keep the review open so the judge can change decisions further.
      const data = res.data?.data
      if (data && typeof data.score === 'number') {
        setSelectedAttempt(prev => (prev ? { ...prev, score: data.score, passed: data.passed } : prev))
      }
      setReviewNotice({ kind: 'saved' })
    },
    onError: () => setReviewNotice({ kind: 'error' }),
  })

  const changeDecisionMutation = useMutation({
    mutationFn: (payload) => api.put('/exam-attempts/change-answer-decision', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-attempts'])
      queryClient.invalidateQueries(['bank-questions'])
      queryClient.invalidateQueries(['exam-decisions'])
      setDecisionModal(null)
      if (res.data?.changed) {
        setReviewNotice({ kind: 'success', count: res.data.recalculatedAttempts })
      } else {
        setReviewNotice({ kind: 'nochange' })
      }
    },
    onError: () => {
      setDecisionModal(null)
      setReviewNotice({ kind: 'error' })
    },
  })

  const releaseMutation = useMutation({
    mutationFn: (examDocumentId) =>
      api.put(`/exams/${examDocumentId}`, { data: { showResults: true } }),
    onSuccess: () => queryClient.invalidateQueries(['admin-attempts'])
  })

  const handleGrade = (attempt) => {
    // Only send the open-text grades the judge actually reviewed — the server
    // recomputes score + passed and never trusts client-supplied values.
    const manual = {}
    for (const q of attempt.questions || []) {
      if (q.type !== 'open_text') continue
      const grades = getFieldGrades(manualGrades, q.id, getAnswerFieldCount(q))
      if (Object.keys(grades).length > 0) manual[q.id] = grades
    }
    gradeMutation.mutate({ attemptId: attempt.id, manualGrades: manual })
  }

  if (isLoading) return <p className="text-gray-500">{t('common.loading')}</p>

  if (selectedAttempt) {
    const questions = selectedAttempt.questions || []
    const answers = selectedAttempt.answers || {}
    // Merge the attempt's question snapshot with the current question-bank
    // data so judges see the latest expected answers and bank decisions.
    const mergedQuestions = questions.map(q => ({ ...q, ...(bankQuestions[q.id] || {}) }))

    const timeSpent = formatTimeSpent(selectedAttempt.timeSpentSeconds)

    const score =
      typeof selectedAttempt.score === 'number' ? `${selectedAttempt.score}%` : '—'
    const isPassed = selectedAttempt.passed === true

    const totals = computeReviewTotals(mergedQuestions, answers, manualGrades)

    // Did the attempt's snapshot predate answer-field configuration?
    const isLegacyOpenText = (q) =>
      q.type === 'open_text' &&
      !Array.isArray(q.answerFieldsLv) &&
      !Array.isArray(q.answerFieldsRu) &&
      !Array.isArray(q.answerFieldsEn)

    return (
      <div>
        <button
          onClick={() => { setSelectedAttempt(null); setManualGrades({}); setReviewNotice(null) }}
          className="text-blue-600 hover:underline text-sm mb-5 block"
        >
          ← {t('admin.results.backToResults')}
        </button>

        {/* Summary card matching Results.jsx style */}
        <div
          className={`rounded-2xl shadow-lg p-5 sm:p-6 border relative overflow-hidden ${isPassed ? 'border-green-400' : 'border-red-400'}`}
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <div className={`absolute top-0 left-0 right-0 h-1 ${isPassed ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-rose-400 to-red-500'}`} />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] sm:text-xs uppercase tracking-[0.18em] mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('admin.results.examLabel') || 'Exam'} — {selectedAttempt.exam?.title || '—'}
              </p>
              <h1
                className="text-lg sm:text-2xl lg:text-3xl font-bold leading-tight truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {selectedAttempt.user?.firstName} {selectedAttempt.user?.lastName}
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                @{selectedAttempt.user?.username}
              </p>
              {timeSpent && (
                <p className="mt-2 sm:mt-3 flex items-center gap-1.5 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                  <ClockIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t('results.timeSpent')}: {timeSpent}
                </p>
              )}
            </div>

            <div className="text-right shrink-0 min-w-[52px]">
              <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight ${isPassed ? 'text-green-500' : 'text-red-500'}`}>
                {score}
              </div>
              <p className="mt-0.5 text-[11px] sm:text-sm font-light capitalize" style={{ color: 'var(--text-muted)' }}>
                {selectedAttempt.submittedAt
                  ? (isPassed ? t('admin.results.passed').toLowerCase() : t('admin.results.failed').toLowerCase())
                  : t('admin.results.inProgress').toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Review notice */}
        {reviewNotice && (
          <div
            role="status"
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
              reviewNotice.kind === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            }`}
          >
            {reviewNotice.kind === 'saved' && t('admin.results.savedReview')}
            {reviewNotice.kind === 'success' && t('admin.results.recalcSuccess', { count: reviewNotice.count ?? 0 })}
            {reviewNotice.kind === 'nochange' && t('admin.results.recalcNoChange')}
            {reviewNotice.kind === 'error' && t('admin.results.recalcError')}
          </div>
        )}

        {/* Detailed review */}
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
                {t('results.timeSpent')}: {timeSpent}
              </p>
            )}
          </div>

          {mergedQuestions.map((q, i) => {
            const userAnswer = answers[q.id]
            const isOpenText = q.type === 'open_text'

            if (!isOpenText) {
              return (
                <QuestionReviewCard
                  key={q.id}
                  question={q}
                  index={i + 1}
                  userAnswer={userAnswer}
                  correctAnswer={q.correctAnswer}
                  isCorrect={isAnswerCorrect(q, userAnswer)}
                  isOpenText={false}
                  language={i18n.language}
                  labels={{
                    correctChoice: t('results.correctChoice') || 'Correct answer',
                    yourChoice: t('admin.results.studentAnswer') || 'Student answer',
                    correct: t('admin.results.correctLabel') || 'Correct',
                    incorrect: t('admin.results.incorrectLabel') || 'Incorrect',
                  }}
                  t={(key) => key}
                />
              )
            }

            // ── Open-text: one review block per answer field ───────────────
            const count = getAnswerFieldCount(q)
            const studentFields = normalizeOpenTextAnswer(userAnswer)
            const fieldGrades = getFieldGrades(manualGrades, q.id, count)
            const questionPoints = Array.from({ length: count }, (_, f) => fieldGrades[f]).filter(v => v === 1).length
            const reviewedCount = Object.keys(fieldGrades).length
            const allReviewed = reviewedCount >= count

            return (
              <div
                key={q.id}
                className="rounded-2xl shadow-lg p-5 border"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 mt-1 flex h-9 w-9 items-center justify-center rounded-full font-semibold ${allReviewed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {i + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-base sm:text-lg font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {getLocalizedField(q, i18n.language, 'text')}
                    </p>

                    {isLegacyOpenText(q) && (
                      <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                        {t('admin.results.legacyNote')}
                      </p>
                    )}

                    {/* Question-level progress + points */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>
                        {allReviewed ? '✓ ' : ''}
                        {t('admin.results.reviewed')}: {reviewedCount}/{count}
                      </span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {t('admin.results.questionPoints')}: {questionPoints}/{count}
                      </span>
                    </div>

                    {/* Per-field review cards */}
                    <div className="mt-4 space-y-3">
                      {Array.from({ length: count }, (_, f) => {
                        const studentText = studentFields[f] ?? ''
                        const expected = getExpectedAnswer(q, f, i18n.language)
                        const grade = fieldGrades[f]
                        const reviewed = grade === 1 || grade === 0
                        const bankDecision = getEffectiveFieldDecision(q, f, decisionsMap[q.id]?.[f])
                        const nextDecision = bankDecision === 'correct' ? 'incorrect' : 'correct'

                        return (
                          <div
                            key={f}
                            className="rounded-xl border p-3.5"
                            style={{
                              borderColor: reviewed ? (grade === 1 ? '#059669' : '#dc2626') : 'var(--border)',
                              backgroundColor: 'var(--bg-secondary)',
                            }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {t('admin.results.answerOfTotal', { current: f + 1, total: count })}
                              </p>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                  reviewed
                                    ? grade === 1
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}
                              >
                                {reviewed
                                  ? (grade === 1 ? t('admin.results.correctLabel') : t('admin.results.incorrectLabel'))
                                  : t('admin.results.notReviewedYet')}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              {/* Student's answer */}
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                                  {t('admin.results.studentAnswerLabel')}
                                </p>
                                <p className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                  {studentText.trim() ? studentText : (
                                    <span style={{ color: 'var(--text-muted)' }}>{t('admin.results.noStudentAnswer')}</span>
                                  )}
                                </p>
                              </div>

                              {/* Expected answer (answer bank) */}
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                                  {t('admin.results.expectedAnswer')}
                                </p>
                                <p className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                  {expected || (
                                    <span style={{ color: 'var(--text-muted)' }}>{t('admin.results.noExpectedAnswer')}</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Bank vs exam vs final decision */}
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <span>
                                {t('admin.results.bankAnswerLabel')}:{' '}
                                <strong style={{ color: bankDecision === 'correct' ? '#059669' : '#dc2626' }}>
                                  {bankDecision === 'correct' ? t('admin.results.correctLabel') : t('admin.results.incorrectLabel')}
                                </strong>
                              </span>
                              <span>
                                {t('admin.results.finalDecisionLabel')}:{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {reviewed
                                    ? (grade === 1 ? t('admin.results.correctLabel') : t('admin.results.incorrectLabel'))
                                    : t('admin.results.notReviewedYet')}
                                </strong>
                              </span>
                              <span>
                                {t('admin.results.pointsAwarded')}: <strong style={{ color: 'var(--text-primary)' }}>{grade === 1 ? 1 : 0}</strong>
                              </span>
                            </div>

                            {/* Decision controls */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setManualGrades(prev => setFieldGrade(prev, q.id, f, 0))}
                                aria-pressed={grade === 0}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                                  grade === 0
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'border-gray-300 hover:border-red-400'
                                }`}
                              >
                                ✗ {t('admin.results.markAsIncorrect')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setManualGrades(prev => setFieldGrade(prev, q.id, f, 1))}
                                aria-pressed={grade === 1}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                                  grade === 1
                                    ? 'bg-green-500 text-white border-green-500'
                                    : 'border-gray-300 hover:border-green-400'
                                }`}
                              >
                                ✓ {t('admin.results.markAsCorrect')}
                              </button>

                              {expected && (
                                <button
                                  type="button"
                                  onClick={() => setDecisionModal({ questionDocumentId: q.documentId, fieldIndex: f, decision: nextDecision })}
                                  className="ml-auto text-xs font-medium text-blue-600 hover:underline"
                                >
                                  {t('admin.results.changeBankDecision')}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Save Review bar */}
        <div className="mt-6 rounded-2xl shadow-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('admin.results.gradingSummary')}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t('admin.results.examTotalPoints')}: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{totals.totalPoints}</span> / {totals.maxPoints} ({totals.percent}%)
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {totals.totalPoints === totals.maxPoints
                ? '✓ ' + t('admin.results.reviewComplete')
                : t('admin.results.reviewIncomplete')}
            </p>
          </div>
          <button
            onClick={() => handleGrade(selectedAttempt)}
            disabled={gradeMutation.isPending}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {gradeMutation.isPending ? t('admin.results.saving') : t('admin.results.saveReview')}
          </button>
        </div>

        {/* Change answer-bank decision — confirmation modal */}
        {decisionModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recalc-confirm-title"
          >
            <div className="w-full max-w-md rounded-2xl shadow-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-5 h-5 text-amber-600" />
                </div>
                <h2 id="recalc-confirm-title" className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {t('admin.results.recalcConfirmTitle')}
                </h2>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {t('admin.results.recalcConfirmBody')}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDecisionModal(null)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() =>
                    changeDecisionMutation.mutate({
                      examDocumentId: selectedAttempt.exam?.documentId,
                      questionDocumentId: decisionModal.questionDocumentId,
                      fieldIndex: decisionModal.fieldIndex,
                      decision: decisionModal.decision,
                    })
                  }
                  disabled={changeDecisionMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {changeDecisionMutation.isPending ? t('admin.results.saving') : t('admin.results.yesUpdateExam')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('admin.results.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.results.count', { filtered: filteredAttempts?.length || 0, total: attempts?.length || 0 })}
          </p>
        </div>
      </div>

      {/* Search + filters toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            placeholder={t('admin.results.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t('admin.results.searchPlaceholder')}
            className="w-full border rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('common.clearSearch') || 'Clear search'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:bg-slate-200 dark:hover:bg-slate-700/50"
              style={{ color: 'var(--text-muted)' }}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label={t('admin.results.colStatus')}
          className="sm:w-44 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <option value="all">{t('admin.results.allStatuses') || 'All statuses'}</option>
          <option value="passed">{t('admin.results.passed')}</option>
          <option value="failed">{t('admin.results.failed')}</option>
          <option value="in_progress">{t('admin.results.inProgress')}</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap px-3 py-2 rounded-lg border text-sm"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <input
            type="checkbox"
            checked={examsOnly}
            onChange={e => setExamsOnly(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          {t('admin.results.examsOnly') || 'Exams only'}
        </label>
      </div>

      {/* No matches — clear-filters empty state */}
      {filteredAttempts?.length === 0 && (
        <div
          className="rounded-xl p-10 text-center mb-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.results.noResults') || 'No attempts match your filters.'}
          </p>
          {(search || statusFilter !== 'all' || examsOnly) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('all'); setExamsOnly(false) }}
              className="mt-2 text-sm font-medium text-blue-600 hover:underline"
            >
              {t('common.clearFilters') || 'Clear filters'}
            </button>
          )}
        </div>
      )}

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
              {t('admin.results.pendingRelease')}
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
                  {t('admin.results.releaseResults')}
                </button>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Grouped by year */}
      {(() => {
        const byYear = {}
        filteredAttempts?.forEach(attempt => {
          const year = attempt.submittedAt
            ? new Date(attempt.submittedAt).getFullYear()
            : t('admin.results.inProgress')
          if (!byYear[year]) byYear[year] = []
          byYear[year].push(attempt)
        })

        const years = Object.keys(byYear).sort((a, b) => b - a)

        return years.map(year => (
          <YearGroup
            key={year}
            year={year}
            attempts={byYear[year]}
            onReview={(attempt) => {
              setSelectedAttempt(attempt)
              setManualGrades(attempt.manualGrades || {})
              setReviewNotice(null)
              setDecisionModal(null)
            }}
          />
        ))
      })()}
    </div>
  )
}
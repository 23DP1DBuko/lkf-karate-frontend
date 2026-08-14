import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import api from '../../api/strapi'
import IconButton from '../../components/IconButton'
import QuestionReviewCard from '../../components/QuestionReviewCard'
import { formatTimeSpent, isAnswerCorrect } from '../../utils/attempts'
import { EyeIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
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
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [manualScores, setManualScores] = useState({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [examsOnly, setExamsOnly] = useState(false)

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['admin-attempts'],
    queryFn: () => api.get('/exam-attempts/all').then(r => r.data.data),
  })



  const filteredAttempts = useMemo(() => {
    return attempts?.filter(attempt => {
      // Search filter
      if (search.trim()) {
        const fullName = `${attempt.user?.firstName} ${attempt.user?.lastName}`.toLowerCase()
        const username = attempt.user?.username?.toLowerCase() || ''
        const examTitle = attempt.exam?.title?.toLowerCase() || ''
        const query = search.toLowerCase()
        if (!fullName.includes(query) && !username.includes(query) && !examTitle.includes(query)) {
          return false
        }
      }
      // Status filter: passed / failed / still in progress
      if (statusFilter === 'passed' && !(attempt.submittedAt && attempt.passed)) return false
      if (statusFilter === 'failed' && !(attempt.submittedAt && !attempt.passed)) return false
      if (statusFilter === 'in_progress' && attempt.submittedAt) return false
      // Exams-only filter: a quick quiz has a course but NO exam relation
      if (examsOnly && !attempt.exam) {
        return false
      }
      return true
    })
  }, [attempts, search, statusFilter, examsOnly])

  const gradeMutation = useMutation({
    mutationFn: ({ attemptId, score, passed, manualGrades }) =>
      api.put(`/exam-attempts/grade/${attemptId}`, { score, passed, manualGrades }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-attempts'])
      setSelectedAttempt(null)
    }
  })

  const releaseMutation = useMutation({
    mutationFn: (examDocumentId) =>
      api.put(`/exams/${examDocumentId}`, { data: { showResults: true } }),
    onSuccess: () => queryClient.invalidateQueries(['admin-attempts'])
  })

  const handleGrade = (attempt) => {
    const questions = attempt.questions || []
    const answers = attempt.answers || {}
    let autoCorrect = 0

    questions.forEach(q => {
      if (isAnswerCorrect(q, answers[q.id])) {
        autoCorrect++
      }
    })

    const openTextPoints = Object.values(manualScores).reduce((sum, val) => sum + (Number(val) || 0), 0)
    const totalPoints = autoCorrect + openTextPoints
    const score = Math.round((totalPoints / questions.length) * 100)
    const passed = score >= (attempt.exam?.passingScore || 70)

    gradeMutation.mutate({ attemptId: attempt.id, score, passed, manualGrades: manualScores })
  }

  if (isLoading) return <p className="text-gray-500">{t('common.loading')}</p>

  if (selectedAttempt) {
    const questions = selectedAttempt.questions || []
    const answers = selectedAttempt.answers || {}

    const timeSpent = formatTimeSpent(selectedAttempt.timeSpentSeconds)

    const score =
      typeof selectedAttempt.score === 'number' ? `${selectedAttempt.score}%` : '—'
    const isPassed = selectedAttempt.passed === true

    return (
      <div>
        <button
          onClick={() => { setSelectedAttempt(null); setManualScores({}) }}
          className="text-blue-600 hover:underline text-sm mb-5 block"
        >
          ← {t('admin.results.backToResults')}
        </button>

        {/* Summary card matching Results.jsx style */}
        <div
          className={`rounded-2xl shadow-lg p-5 sm:p-6 border relative overflow-hidden ${isPassed ? 'border-green-400' : 'border-red-400'}`}
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          {/* Color accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${isPassed ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-rose-400 to-red-500'}`} />

          <div className="flex items-start justify-between gap-4">
            {/* Left: info */}
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
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('results.timeSpent')}: {timeSpent}
                </p>
              )}
            </div>

            {/* Right: score + status */}
            <div className="text-right shrink-0 min-w-[52px]">
              <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight ${isPassed ? 'text-green-500' : 'text-red-500'}`}>
                {score}
              </div>
              <p className="mt-0.5 text-[11px] sm:text-sm font-light capitalize" style={{ color: 'var(--text-muted)' }}>
                {selectedAttempt.submittedAt
                  ? (isPassed ? t('admin.results.passed').toLowerCase() : t('admin.results.failed').toLowerCase())
                  : t('admin.results.inProgress').toLowerCase()}
              </p>
              {selectedAttempt.submittedAt && (
                <p className="mt-1 text-[10px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(selectedAttempt.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Detailed review using QuestionReviewCard matching Results.jsx style */}
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

          {questions.map((q, i) => {
            const userAnswer = answers[q.id]
            const isOpenText = q.type === 'open_text'
            const isCorrect = isAnswerCorrect(q, userAnswer)

            return (
              <QuestionReviewCard
                key={q.id}
                question={q}
                index={i + 1}
                userAnswer={userAnswer}
                correctAnswer={q.correctAnswer}
                isCorrect={isCorrect}
                isOpenText={isOpenText}
                language="en"
                labels={{
                  correctChoice: t('results.correctChoice') || 'Correct answer',
                  yourChoice: t('admin.results.studentAnswer') || 'Student answer',
                  openTextNote: t('results.openTextNote') || 'Open text answers are reviewed manually based on the stored correct answer.',
                  correct: t('admin.results.correctLabel') || 'Correct',
                  incorrect: t('admin.results.incorrectLabel') || 'Incorrect',
                }}
                t={(key) => key}
                renderExtra={isOpenText ? () => (
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                      {t('admin.results.awardPoints')}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setManualScores(prev => ({ ...prev, [q.id]: 0 }))}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                          manualScores[q.id] === 0
                            ? 'bg-red-500 text-white border-red-500'
                            : 'border-gray-300 hover:border-red-400'
                        }`}
                      >
                        {t('admin.results.btnIncorrect')} (0 pts)
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualScores(prev => ({ ...prev, [q.id]: 1 }))}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                          manualScores[q.id] === 1
                            ? 'bg-green-500 text-white border-green-500'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {t('admin.results.btnCorrect')} (1 pt)
                      </button>
                    </div>
                  </div>
                ) : null}
              />
            )
          })}
        </div>

        {/* Save Grades bar */}
        <div className="mt-6 rounded-2xl shadow-lg p-6 flex items-center justify-between border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Current score: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{score}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('admin.results.openTextGraded') || 'Open text questions graded'}: {Object.keys(manualScores).length}
            </p>
          </div>
          <button
            onClick={() => handleGrade(selectedAttempt)}
            disabled={gradeMutation.isPending}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {gradeMutation.isPending ? t('admin.results.saving') : t('admin.results.saveGrades')}
          </button>
        </div>
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
        // Group attempts by year
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
            onReview={(attempt) => { setSelectedAttempt(attempt); setManualScores(attempt.manualGrades || {}) }}
          />
        ))
      })()}
    </div>
  )
}
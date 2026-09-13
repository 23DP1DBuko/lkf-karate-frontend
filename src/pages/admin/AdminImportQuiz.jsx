// AdminImportQuiz.jsx — persistent post-import answer-key review.
//
// This page assigns the official True/False answer to imported questions that
// still have none. It is fully persistent:
//   - every answer is saved to the question immediately
//     (PUT /questions/:documentId → correctAnswer + answerStatus 'fromQuiz'),
//   - question loading paginates explicitly, so a review with hundreds of
//     questions is complete (never truncated at Strapi's 100-row page cap),
//   - closing or refreshing the page never loses progress — reopening it
//     reloads the saved answers from the backend.
//
// It resolves the review workspace from the URL:
//   ?examId=<documentId>               — the review exam (preferred)
//   ?courseId=...&questionSetKey=...   — the course's persistent review exam
//   ?courseId=...&questionIds=a,b,c    — legacy explicit list
//   ?courseId=...&sourceFile=...       — legacy course/source mode
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from '../../components/Skeleton'
import { CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import {
  fetchAllQuestions,
  fetchExamQuestions,
  fetchQuestionsToReview,
  fetchReviewExam,
  saveReviewAnswer,
} from '../../utils/reviewImport'

const LANG_LABELS = { en: '🇬🇧 EN', lv: '🇱🇻 LV', ru: '🇷🇺 RU' }
const LANGS = ['en', 'lv', 'ru']
const langKey = (lang) => `text${lang.charAt(0).toUpperCase()}${lang.slice(1)}`

export default function AdminImportQuiz() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const examId = searchParams.get('examId') || ''
  const courseId = searchParams.get('courseId') || ''
  const sourceFile = searchParams.get('sourceFile') || ''
  const questionSetKey = searchParams.get('questionSetKey') || ''
  // Depend on the raw string (stable primitive), not the searchParams object —
  // its identity can change every render and would restart the load effect.
  const questionIdsParam = searchParams.get('questionIds') || ''
  const questionIds = useMemo(
    () => questionIdsParam.split(',').map((s) => s.trim()).filter(Boolean),
    [questionIdsParam],
  )

  // Keep `t` out of the load effect's dependencies — i18next returns a new `t`
  // on language change, which would needlessly refetch and could overwrite
  // in-flight answers.
  const tRef = useRef(t)
  tRef.current = t

  const [questions, setQuestions] = useState(null) // null = loading
  const [answers, setAnswers] = useState({}) // questionId -> 'true' | 'false'
  const [saving, setSaving] = useState({}) // questionId -> bool
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')

  // ── Load the questions + their already-saved answers ──────────────────────
  useEffect(() => {
    if (!examId && !courseId) {
      setQuestions([])
      return
    }
    let cancelled = false

    async function load() {
      setQuestions(null)
      setLoadError('')
      try {
        let list = []
        if (examId) {
          list = await fetchExamQuestions(examId)
        } else if (questionIds.length > 0) {
          list = await fetchAllQuestions({
            'filters[course][documentId][$eq]': courseId,
            'filters[documentId][$in]': questionIds.join(','),
          })
        } else {
          // Course mode: prefer the persistent review exam, fall back to its
          // underlying query when the exam has not been created yet.
          const exam = await fetchReviewExam(courseId)
          if (exam) {
            list = await fetchExamQuestions(exam.documentId)
          } else {
            list = await fetchQuestionsToReview({ courseId, questionSetKey })
            if (sourceFile) list = list.filter((q) => q.sourceFile === sourceFile)
          }
        }
        if (cancelled) return

        const sorted = list.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        setQuestions(sorted)

        // Restore the answers already saved in the database.
        const restored = {}
        for (const q of sorted) {
          if (q.correctAnswer != null) restored[q.id] = q.correctAnswer
        }
        setAnswers(restored)
      } catch (err) {
        if (cancelled) return
        setLoadError(err.response?.data?.error?.message || tRef.current('admin.importQuiz.loadError'))
        setQuestions([])
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [examId, courseId, sourceFile, questionSetKey, questionIds])

  const progress = useMemo(() => {
    const list = questions || []
    const total = list.length
    const reviewed = list.filter((q) => answers[q.id] != null).length
    return { total, reviewed, remaining: total - reviewed, complete: total > 0 && reviewed === total }
  }, [questions, answers])

  // Save one answer immediately; roll back the optimistic value on failure.
  const handleAnswer = async (q, val) => {
    const previous = answers[q.id]
    if (previous === val) return
    setAnswers((p) => ({ ...p, [q.id]: val }))
    setSaving((p) => ({ ...p, [q.id]: true }))
    setError('')
    try {
      await saveReviewAnswer(q.documentId, val)
    } catch (err) {
      setAnswers((p) => {
        const next = { ...p }
        if (previous == null) delete next[q.id]
        else next[q.id] = previous
        return next
      })
      setError(err.response?.data?.error?.message || err.message || t('admin.importQuiz.saveError'))
    } finally {
      setSaving((p) => ({ ...p, [q.id]: false }))
    }
  }

  const statusLabel = progress.complete
    ? t('admin.importQuiz.reviewCompleted')
    : progress.reviewed > 0
      ? t('admin.importQuiz.continueReview')
      : t('admin.importQuiz.startReview')

  // ── Loading ───────────────────────────────────────────────────────────────
  if (questions === null) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">
          {t('admin.importQuiz.title')}
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('admin.importQuiz.subtitle')}
        </p>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  // ── Nothing to review ─────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => navigate('/admin/import')}
          className="text-blue-600 hover:underline text-sm mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('admin.importQuiz.backToImport')}
        </button>
        <div className="rounded-2xl shadow p-8 text-center border" style={{ backgroundColor: 'var(--bg-card)' }}>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {loadError || t('admin.importQuiz.noneUnanswered')}
          </p>
          <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>
            {t('admin.importQuiz.missingParamsDesc')}
          </p>
          <button
            onClick={() => navigate('/admin/import')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700"
          >
            {t('admin.importQuiz.backToImport')}
          </button>
        </div>
      </div>
    )
  }

  // ── Review completed ──────────────────────────────────────────────────────
  if (progress.complete) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-2xl shadow p-8 text-center border" style={{ backgroundColor: 'var(--bg-card)' }}>
          <CheckCircleIcon className="w-14 h-14 mx-auto mb-4 text-emerald-500" />
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('admin.importQuiz.reviewCompleted')}
          </h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.importQuiz.completionBody', { count: questions.length })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/admin/questions')}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700"
            >
              {t('admin.importQuiz.goToQuestions')}
            </button>
            <button
              onClick={() => navigate('/admin/exams')}
              className="border px-6 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {t('admin.importQuiz.openExamsPage')}
            </button>
            <button
              onClick={() => navigate('/admin/import')}
              className="border px-6 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {t('admin.importQuiz.importAnother')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Review in progress ────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/admin/import')}
        className="text-blue-600 hover:underline text-sm mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {t('admin.importQuiz.backToImport')}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">
            {t('admin.importQuiz.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.importQuiz.subtitle')}
          </p>
          {questionSetKey && (
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('admin.importQuiz.questionSet')}: {questionSetKey}
            </p>
          )}
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <span
            className={`self-start sm:self-auto text-sm font-semibold px-3 py-1.5 rounded-full ${
              progress.reviewed > 0
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {statusLabel}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('admin.importQuiz.questionsToReview')}: {progress.total}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('admin.importQuiz.reviewedOf', { reviewed: progress.reviewed, total: progress.total })}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {questions.map((q, index) => {
          const val = answers[q.id]
          const isReviewed = val != null
          const primaryText = getLocalizedField(q, i18n.language, 'text') || q.textLv || '—'
          return (
            <div
              key={q.id}
              className="rounded-2xl shadow p-5 border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                    #{q.order ?? index + 1}
                  </span>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {primaryText}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isReviewed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {saving[q.id]
                    ? t('admin.importQuiz.saving')
                    : isReviewed
                      ? t('admin.importQuiz.reviewed')
                      : t('admin.importQuiz.notReviewed')}
                </span>
              </div>

              {/* Other translations together with the primary text */}
              {LANGS.filter((lang) => {
                const text = q[langKey(lang)]
                return text && text !== primaryText
              }).map((lang) => (
                <p key={lang} className="text-xs mb-1 pl-6" style={{ color: 'var(--text-muted)' }}>
                  {LANG_LABELS[lang]} {q[langKey(lang)]}
                </p>
              ))}

              <div className="flex gap-3 max-w-md mt-3">
                {[
                  { val: 'true', label: t('exam.yes') },
                  { val: 'false', label: t('exam.no') },
                ].map((opt) => {
                  const selected = val === opt.val
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => handleAnswer(q, opt.val)}
                      aria-pressed={selected}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        selected
                          ? opt.val === 'true'
                            ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-600/20'
                            : 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                          : 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      style={{
                        borderColor: selected ? undefined : 'var(--border)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress is saved automatically — this bar just shows where we are. */}
      <div
        className="rounded-2xl shadow p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('admin.importQuiz.reviewedOf', { reviewed: progress.reviewed, total: progress.total })}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t('admin.importQuiz.remaining', { count: progress.remaining })}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/exams')}
          className="border px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {t('admin.importQuiz.openExamsPage')}
        </button>
      </div>
    </div>
  )
}

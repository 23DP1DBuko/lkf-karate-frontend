// AdminImportQuiz.jsx — admin-only True/False answer-key quiz.
//
// Two entry modes:
//   ?courseId=...&questionIds=...  — explicit question list (Word "import
//                                    without answers" flow)
//   ?courseId=...&sourceFile=...   — every still-unanswered question of the
//                                    course (optionally from one source file)
//                                    — used by the PDF import flow
//
// The quiz assigns official correct answers to questions imported WITHOUT
// answers. Progress is autosaved to localStorage (draft) so the admin can
// continue later; final completion is blocked while questions remain
// unanswered, and submitting writes the answer key (answerStatus → answered)
// through PUT /questions/bulk-update-answers.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from '../../components/Skeleton'
import Toast from '../../components/Toast'
import { CheckCircleIcon, ArrowLeftIcon, DocumentCheckIcon } from '@heroicons/react/24/outline'

const DRAFT_PREFIX = 'answerKeyDraft:'
const LANG_LABELS = { en: '🇬🇧 EN', lv: '🇱🇻 LV', ru: '🇷🇺 RU' }

export default function AdminImportQuiz() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const courseId = searchParams.get('courseId') || ''
  const sourceFile = searchParams.get('sourceFile') || ''
  const questionIds = useMemo(
    () =>
      (searchParams.get('questionIds') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [searchParams],
  )

  const draftKey = useMemo(
    () => `${DRAFT_PREFIX}${courseId}:${sourceFile || 'all'}`,
    [courseId, sourceFile],
  )

  const [questions, setQuestions] = useState(null) // null = loading
  const [loadError, setLoadError] = useState('')
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState(null)
  const [draftMeta, setDraftMeta] = useState(null) // { savedAt } of the loaded draft

  const hasUnsaved = !submitted && Object.keys(answers).length > 0

  // Fetch the questions to review.
  useEffect(() => {
    if (!courseId) {
      setQuestions([])
      return
    }
    let cancelled = false

    const params = { sort: 'order:asc' }
    if (questionIds.length > 0) {
      params['filters[documentId][$in]'] = questionIds.join(',')
      params['filters[course][documentId][$eq]'] = courseId
      params['populate[0]'] = 'course'
    } else {
      // Course mode: every question still missing its official answer.
      // (Every import flow sets answerStatus='missing' explicitly.)
      params['filters[course][documentId][$eq]'] = courseId
      params['filters[answerStatus][$eq]'] = 'missing'
      if (sourceFile) params['filters[sourceFile][$eq]'] = sourceFile
      params['pagination[pageSize]'] = 1000
    }

    api
      .get('/questions', { params })
      .then((res) => {
        if (cancelled) return
        const list = (res.data.data || [])
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        setQuestions(list)

        // Restore any saved draft (continue-later support).
        let restored = {}
        let meta = null
        try {
          const raw = localStorage.getItem(draftKey)
          if (raw) {
            const parsed = JSON.parse(raw)
            restored = parsed.answers || {}
            meta = parsed.savedAt ? { savedAt: parsed.savedAt } : null
          }
        } catch { /* corrupt draft — ignore */ }
        const merged = {}
        for (const q of list) {
          if (restored[q.id]) merged[q.id] = restored[q.id]
        }
        setAnswers(merged)
        setDraftMeta(meta)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.response?.data?.error?.message || t('admin.importQuiz.loadError'))
        setQuestions([])
      })
    return () => {
      cancelled = true
    }
  }, [courseId, questionIds, sourceFile, draftKey, t])

  // Autosave the draft to localStorage on every change (resume later).
  useEffect(() => {
    if (questions === null || questions.length === 0) return
    if (Object.keys(answers).length === 0) return
    try {
      localStorage.setItem(draftKey, JSON.stringify({ answers, savedAt: Date.now(), total: questions.length }))
    } catch { /* storage full / private mode */ }
  }, [answers, draftKey, questions])

  // Warn before leaving with unsaved answers.
  useEffect(() => {
    if (!hasUnsaved) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  const answeredCount = questions?.filter((q) => answers[q.id]).length || 0
  const total = questions?.length || 0
  const remaining = total - answeredCount
  const allAnswered = total > 0 && answeredCount === total

  const handleAnswer = (q, val) => {
    setAnswers((prev) => ({ ...prev, [q.id]: val }))
    setError('')
    setDraftMeta({ savedAt: Date.now() })
  }

  const handleSaveProgress = () => {
    if (!questions || questions.length === 0) return
    try {
      localStorage.setItem(draftKey, JSON.stringify({ answers, savedAt: Date.now(), total: questions.length }))
      setDraftMeta({ savedAt: Date.now() })
      setToast({ message: t('admin.importQuiz.savedProgress', { answered: answeredCount, total }), type: 'success' })
    } catch {
      setToast({ message: t('admin.importQuiz.saveFailed'), type: 'error' })
    }
  }

  const handleSubmit = async () => {
    if (!questions || questions.length === 0) return
    const unanswered = questions.filter((q) => !answers[q.id])
    if (unanswered.length > 0) {
      setError(t('admin.importQuiz.unansweredError', { count: unanswered.length }))
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const updates = questions.map((q) => ({
        id: q.id,
        correctAnswer: answers[q.id],
      }))
      await api.put('/questions/bulk-update-answers', { courseId, updates })
      setSubmitted(true)
      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
      setToast({
        message: t('admin.importQuiz.success', { count: updates.length }),
        type: 'success',
      })
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || t('admin.importQuiz.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  // Loading skeleton
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

  // Missing params / no questions found
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
            {loadError || (questionIds.length === 0
              ? t('admin.importQuiz.noneUnanswered')
              : t('admin.importQuiz.missingParams'))}
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

  // Success state
  if (submitted) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-2xl shadow p-8 text-center border" style={{ backgroundColor: 'var(--bg-card)' }}>
          <CheckCircleIcon className="w-14 h-14 mx-auto mb-4 text-emerald-500" />
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('admin.importQuiz.doneTitle')}
          </h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.importQuiz.success', { count: questions.length })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/admin/questions')}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700"
            >
              {t('admin.importQuiz.goToQuestions')}
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

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/admin/import')}
        className="text-blue-600 hover:underline text-sm mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {t('admin.importQuiz.backToImport')}
      </button>

      {/* Header + progress */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">
            {t('admin.importQuiz.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.importQuiz.subtitle')}
          </p>
          {sourceFile && (
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              {sourceFile}
            </p>
          )}
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <span
            className={`self-start sm:self-auto text-sm font-semibold px-3 py-1.5 rounded-full ${
              allAnswered
                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
            }`}
          >
            {t('admin.importQuiz.progress', { answered: answeredCount, total })}
            <span className="ml-2 opacity-70">· {t('admin.importQuiz.remaining', { count: remaining })}</span>
          </span>
          {draftMeta?.savedAt && (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {t('admin.importQuiz.draftSavedAt', { time: new Date(draftMeta.savedAt).toLocaleTimeString() })}
            </span>
          )}
        </div>
      </div>

      {/* Save progress */}
      <button
        type="button"
        onClick={handleSaveProgress}
        className="mb-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition hover:border-blue-400"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <DocumentCheckIcon className="w-4 h-4" />
        {t('admin.importQuiz.saveProgress')}
      </button>

      {/* Error banner */}
      {(error || loadError) && (
        <div className="mb-4 p-4 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error || loadError}</p>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((q, index) => {
          const isAnswered = !!answers[q.id]
          const primaryText = getLocalizedField(q, i18n.language, 'text') || q.textLv || '—'
          return (
            <div
              key={q.id}
              className={`rounded-2xl shadow p-5 border transition ${
                !isAnswered && error ? 'border-red-300 dark:border-red-700' : ''
              }`}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                  #{q.order ?? index + 1}
                </span>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {primaryText}
                </p>
              </div>

              {/* Other translations together with the primary text */}
              {(['en', 'lv', 'ru']).filter(lang => {
                const txt = q[`text${lang.charAt(0).toUpperCase() + lang.slice(1)}`]
                return txt && txt !== primaryText
              }).map(lang => (
                <p key={lang} className="text-xs mb-1 pl-6" style={{ color: 'var(--text-muted)' }}>
                  {LANG_LABELS[lang]} {q[`text${lang.charAt(0).toUpperCase() + lang.slice(1)}`]}
                </p>
              ))}

              <div className="flex gap-3 max-w-md mt-3">
                {[
                  { val: 'true', label: t('exam.yes') },
                  { val: 'false', label: t('exam.no') },
                ].map((opt) => {
                  const selected = answers[q.id] === opt.val
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

      {/* Submit — blocked while questions remain unanswered */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !allAnswered}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        title={!allAnswered ? t('admin.importQuiz.unansweredError', { count: remaining }) : ''}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t('admin.importQuiz.submitting')}
          </>
        ) : (
          t('admin.importQuiz.submit')
        )}
      </button>
      {!allAnswered && (
        <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          {t('admin.importQuiz.submitBlocked', { count: remaining })}
        </p>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

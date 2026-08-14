import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import api, { getLocalizedField } from '../../api/strapi'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from '../../components/Skeleton'
import ErrorState from '../../components/ErrorState'
import { useExamAttempt } from '../../context/useExamAttempt'
import { useAuth } from '../../context/useAuth'
import { AcademicCapIcon, VideoCameraIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline'

export default function CourseDetail() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { i18n, t } = useTranslation()
  const { user } = useAuth()
  const { activeAttempt } = useExamAttempt()
  const [examToStart, setExamToStart] = useState(null)

  const { data: course, isLoading: courseLoading, isError: courseError, error, refetch } = useQuery({
    queryKey: ['course', documentId],
    queryFn: () => api.get(`/courses/${documentId}`).then(r => r.data.data),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  usePageTitle(getLocalizedField(course, i18n.language, 'title'))

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', documentId],
    queryFn: () => api.get(`/chapters?filters[course][documentId][$eq]=${documentId}&sort=order:asc`).then(r => r.data.data),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: progressData } = useQuery({
    queryKey: ['chapter-progress'],
    queryFn: () => api.get('/chapter-progress').then(r => r.data.data),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: exams } = useQuery({
    queryKey: ['exams', documentId],
    queryFn: () => api.get(`/exams?filters[course][documentId][$eq]=${documentId}&populate[questions]=true`).then(r => r.data.data),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  // The user's own attempts — used to spot exams they already submitted
  const { data: attempts } = useQuery({
    queryKey: ['attempts', user?.id],
    queryFn: () =>
      api
        .get('/exam-attempts?populate=exam,course&sort=createdAt:desc')
        .then(r => r.data.data),
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const submittedExamIds = useMemo(() => {
    const ids = new Set()
    ;(attempts || []).forEach(a => {
      if (a.submittedAt && a.exam?.documentId) ids.add(a.exam.documentId)
    })
    return ids
  }, [attempts])

  const getExamWindowState = (exam) => {
    const now = new Date()
    const openAt = exam.openAt ? new Date(exam.openAt) : null
    const closeAt = exam.closeAt ? new Date(exam.closeAt) : null

    if (openAt && now < openAt) {
      return { state: 'upcoming', label: `Opens on ${openAt.toLocaleString()}` }
    }

    if (closeAt && now > closeAt) {
      return { state: 'closed', label: 'Closed' }
    }

    return { state: 'open', label: 'Start Exam' }
  }

  if (courseError) {
    return <ErrorState error={error} onRetry={refetch} fullPage />
  }

  if (courseLoading || chaptersLoading) return (
    <div className="min-h-screen space-y-4">
      <div className="h-4 w-24 rounded animate-pulse mb-4" style={{ backgroundColor: 'var(--border)' }} />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )

  return (
    <div>          <Link to="/courses" className="text-blue-600 hover:underline text-sm mb-4 block">
            {t('course.backToCourses')}
          </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2">
          {getLocalizedField(course, i18n.language, 'title') || course?.titleLv}
        </h1>
        <p className="text-gray-500 mb-8">
          {getLocalizedField(course, i18n.language, 'description') || course?.descriptionLv}
        </p>

        <h2 className="text-xl font-semibold mb-4">{t('course.chapters')}</h2>

        {chapters?.length === 0 && (
          <p className="text-gray-400">{t('course.noChapters')}</p>
        )}

        <div className="space-y-3">
          {chapters?.map((chapter, index) => {
            const seen = progressData?.some(p => p.chapter?.documentId === chapter.documentId)
            return (
              <Link
                key={chapter.id}
                to={`/courses/${documentId}/chapters/${chapter.documentId}`}
                className="rounded-xl shadow hover:shadow-md transition p-5 flex items-center gap-4 block"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${seen ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {seen ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{getLocalizedField(chapter, i18n.language, 'title') || chapter?.titleLv}</h3>
                  {chapter.videoUrl && (
                    <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                      <VideoCameraIcon className="w-3.5 h-3.5" />
                      {t('course.includesVideo')}
                    </span>
                  )}
                </div>
                {seen && (
                  <span className="text-xs text-green-600 font-medium">{t('course.completed')}</span>
                )}
              </Link>
            )
          })}
        </div>
          {chapters?.length > 0 && (
            <div className="mt-6">
              <Link
                to={`/courses/${documentId}/quiz`}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 inline-flex items-center gap-2"
              >
                {t('course.quickQuiz')}
              </Link>
            </div>
          )}
        {(() => {
          const now = new Date()

          const activeExams = exams?.filter(exam => {
            const closeAt = exam.closeAt ? new Date(exam.closeAt) : null
            return !closeAt || closeAt >= now
          }) || []

          const archivedExams = exams?.filter(exam => {
            const closeAt = exam.closeAt ? new Date(exam.closeAt) : null
            return closeAt && closeAt < now
          }) || []

          return (
            <>
              {activeExams.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">{t('course.activeExams')}</h2>
                  <div className="space-y-3">
                    {activeExams.map(exam => {
                      const windowState = getExamWindowState(exam)
                      const alreadyCompleted = submittedExamIds.has(exam.documentId)
                      return (
                        <div
                          key={exam.id}
                          className="rounded-xl shadow hover:shadow-md transition p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          style={{ backgroundColor: 'var(--bg-card)' }}
                        >
                          <div>
                            <h3 className="font-semibold">
                              {getLocalizedField(exam, i18n.language, 'title') || exam.title}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {exam.duration} {t('course.minutes')} •{' '}
                              {exam.questions?.length || exam.questionCount || 0} {t('course.questions')}
                            </p>
                          </div>

                          <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
                            {user?.isAdmin && (
                              <Link
                                to={`/admin/exams/${exam.documentId}/monitoring`}
                                className="inline-flex items-center justify-center gap-1.5 border px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto text-center transition hover:border-blue-400 hover:text-blue-600"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                                title={t('course.monitorExam')}
                              >
                                <EyeIcon className="w-4 h-4" />
                                <span className="sm:hidden lg:inline">{t('course.monitorExam')}</span>
                              </Link>
                            )}
                            {alreadyCompleted ? (
                              <span
                                className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto text-center"
                                aria-disabled="true"
                              >
                                {t('course.alreadyCompleted')}
                              </span>
                            ) : windowState.state === 'open' ? (
                              <button
                                onClick={() => setExamToStart(exam)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto text-center hover:bg-blue-700 transition"
                              >
                                {t('course.startExam')}
                              </button>
                            ) : (
                              <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto text-center">
                                {windowState.label}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {archivedExams.length > 0 && (
                <div className="mt-8">
                  <details className="rounded-xl border border-gray-200 bg-white">
                    <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-gray-700">
                      {t('course.archivedExams', { count: archivedExams.length })}
                    </summary>
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      {archivedExams.map(exam => {
                        return (
                          <div
                            key={exam.id}
                            className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div>
                              <h3 className="font-semibold text-gray-700">
                                {getLocalizedField(exam, i18n.language, 'title') || exam.title}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {exam.duration} {t('course.minutes')} •{' '}
                                {exam.questions?.length || exam.questionCount || 0} {t('course.questions')}
                              </p>
                            </div>

                            <span className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto text-center">
                              {t('course.closed')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </details>
                </div>
              )}
            </>
          )
        })()}

      {/* ── Exam start ritual ── */}
      {examToStart && (
        <ExamStartModal
          exam={examToStart}
          hasActiveAttempt={
            !!activeAttempt &&
            !activeAttempt.submittedAt &&
            activeAttempt.exam?.documentId === examToStart.documentId
          }
          onConfirm={() => {
            const id = examToStart.documentId
            setExamToStart(null)
            navigate(`/exam/${id}`)
          }}
          onClose={() => setExamToStart(null)}
        />
      )}
    </div>
  )
}

/* ─── Pre-exam confirmation modal ─────────────────────────────────────────── */
function ExamStartModal({ exam, hasActiveAttempt, onConfirm, onClose }) {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-start-title"
    >
      <div
        className="max-w-md w-full rounded-2xl p-6 shadow-2xl border relative animate-fade-in"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ color: 'var(--text-muted)' }}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center mb-4">
          <AcademicCapIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>

        <h2 id="exam-start-title" className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {hasActiveAttempt ? t('exam.ritualResumeTitle') : t('exam.ritualTitle')}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {hasActiveAttempt ? t('exam.ritualResumeDesc') : t('exam.ritualDesc')}
        </p>

        <p
          className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          {getLocalizedField(exam, i18n.language, 'title') || exam.title}
        </p>

        <dl className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center">
            <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('exam.ritualDuration')}</dt>
            <dd className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {exam.duration}
              <span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-muted)' }}>min</span>
            </dd>
          </div>
          <div className="text-center">
            <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('exam.ritualQuestions')}</dt>
            <dd className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{exam.questions?.length || exam.questionCount || 0}</dd>
          </div>
          <div className="text-center">
            <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('exam.ritualPassingScore')}</dt>
            <dd className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {exam.passingScore != null ? `${exam.passingScore}%` : '—'}
            </dd>
          </div>
        </dl>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition hover:bg-gray-50 dark:hover:bg-gray-800"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {t('exam.notNow')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition active:scale-[0.98]"
          >
            {hasActiveAttempt ? t('exam.resume') : t('exam.begin')}
          </button>
        </div>
      </div>
    </div>
  )
}
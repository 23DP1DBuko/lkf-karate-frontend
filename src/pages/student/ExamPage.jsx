import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/strapi'
import MediaDisplay from '../../components/MediaDisplay'
import { SkeletonCard } from '../../components/Skeleton'
import { useExamAttempt } from '../../context/useExamAttempt'
import { useTranslation } from 'react-i18next'
import ExamQuestionView from '../../components/questions/ExamQuestionView'
import YesNoQuestion from '../../components/questions/YesNoQuestion'
import MultipleChoiceQuestion from '../../components/questions/MultipleChoiceQuestion'
import AkaAoQuestion from '../../components/questions/AkaAoQuestion'
import QuestionProgressDots from '../../components/questions/QuestionProgressDots'
import OpenTextQuestion from '../../components/questions/OpenTextQuestion'
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

export default function ExamPage() {
  const { t } = useTranslation()
  const { documentId } = useParams()
  const navigate = useNavigate()
  const startedRef = useRef(false)
  const didHydrateAnswers = useRef(false)
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [timedOut, setTimedOut] = useState(false)
  const [completedExam, setCompletedExam] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [currentIndex, setCurrentIndex] = useState(0)
  const { setActiveAttempt, clearActiveAttempt } = useExamAttempt()
  const examRef = useRef(null)
  const lastSavedRef = useRef(null)
  const answersRef = useRef(answers)
  const autoSubmittedRef = useRef(false)

  // ── Silent anti-cheat tracking (no UI, no warnings) ────────────────────
  // Counts blur/hidden events and accumulates the time the page was away,
  // then reports the counters with every save-progress/submit call.
  const trackingRef = useRef({
    blurCount: 0,
    totalTimeOutsideMs: 0,
    awaySince: null,
    lastVisibilityState: 'visible',
    lastKnownPage: 'exam',
  })

  // Build the tracking payload sent alongside answers on every save.
  const getTrackingPayload = () => {
    const tr = trackingRef.current
    return {
      blurCount: tr.blurCount,
      totalTimeOutsideSeconds: Math.floor(tr.totalTimeOutsideMs / 1000),
      lastVisibilityState: tr.lastVisibilityState,
      lastKnownPage: tr.lastKnownPage,
    }
  }

  useEffect(() => {
    const markAway = () => {
      const tr = trackingRef.current
      if (tr.awaySince !== null) return // already counted
      tr.blurCount += 1
      tr.awaySince = Date.now()
      tr.lastVisibilityState = 'hidden'
    }
    const markBack = () => {
      const tr = trackingRef.current
      if (tr.awaySince === null) return
      tr.totalTimeOutsideMs += Date.now() - tr.awaySince
      tr.awaySince = null
      tr.lastVisibilityState = 'visible'
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') markAway()
      else markBack()
    }
    const onBlur = () => markAway()
    const onFocus = () => markBack()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitError(null)
    setTimedOut(false)
    setSubmitting(true)
    try {
      const res = await api.post('/exams/submit', { attemptId: attempt, answers, ...getTrackingPayload() })

      navigate('/results', {
        state: {
          justSubmittedAttemptId: attempt,
          justSubmittedMeta: {
            ...res.data,
            type: 'exam',
          },
        },
      })
      clearActiveAttempt()
    } catch (err) {
      const message = err.response?.data?.error?.message || err?.message || 'Failed to submit exam'
      console.error('Failed to submit exam:', message)
      setSubmitError(message)
      setSubmitting(false)
    }
  }, [submitting, attempt, answers, navigate, clearActiveAttempt])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    

    api.post('/exams/start', { examId: documentId })
      .then(res => {
        setAttempt(res.data.attemptId)
        setQuestions(res.data.questions || [])
        setAnswers(res.data.answers || {})
        didHydrateAnswers.current = true
        setTimeLeft(res.data.remainingSeconds || res.data.duration * 60)
        setLoading(false)

        examRef.current = {
          id: res.data.attemptId,
          exam: {
            title: res.data.examTitle || 'Exam',
            documentId,
          },
        }
        setActiveAttempt(examRef.current)
      })
      .catch(err => {
        const message = err.response?.data?.error?.message || 'Failed to start exam'
        if (message.toLowerCase().includes('already completed')) {
          setCompletedExam(true)
        }
        setLoading(false)
      })
  }, [documentId, setActiveAttempt])

  // Keep answersRef in sync for use in callbacks (beforeunload, etc.)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Debounced autosave — saves 2 seconds after the last answer change
  useEffect(() => {
    if (!attempt) return
    const currentJson = JSON.stringify(answers)
    if (lastSavedRef.current === currentJson) return

    const timer = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await api.post('/exams/save-progress', {
          attemptId: attempt,
          answers,
          ...getTrackingPayload(),
        })
        lastSavedRef.current = JSON.stringify(answers)
        setSaveStatus('saved')
      } catch (err) {
        console.error('Autosave failed:', err?.message)
        setSaveStatus('error')
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [answers, attempt])

  // Auto-clear saved/error status after 2.5 seconds
  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
      const timer = setTimeout(() => setSaveStatus(null), 2500)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  // Save progress when the user leaves the page
  useEffect(() => {
    if (!attempt) return

    const handleBeforeUnload = () => {
      const currentAnswers = answersRef.current
      if (lastSavedRef.current === JSON.stringify(currentAnswers)) return

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'
        navigator.sendBeacon(
          `${API_URL}/api/exams/save-progress`,
          new Blob(
            [JSON.stringify({ attemptId: attempt, answers: currentAnswers, ...getTrackingPayload() })],
            { type: 'application/json' }
          )
        )
      } catch { /* best-effort */ }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [attempt])

  // Timer countdown — pure, no side effects
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  // Auto-submit when timer expires — async, ref-guarded
  useEffect(() => {
    if (timeLeft !== 0 || timeLeft === null) return
    if (autoSubmittedRef.current) return
    autoSubmittedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimedOut(true)

    api.post('/exams/submit', { attemptId: attempt, answers, ...getTrackingPayload() })
      .then(res => {
        navigate('/results', {
          state: {
            justSubmittedAttemptId: attempt,
            justSubmittedMeta: {
              ...res.data,
              type: 'exam',
            },
          },
        })
        clearActiveAttempt()
      })
      .catch(err => {
        const message = err.response?.data?.error?.message || err?.message || 'Failed to submit exam'
        console.error('Failed to auto-submit exam:', message)
        setSubmitError(message)
        setSubmitting(false)
      })
  }, [timeLeft, attempt, answers, navigate, clearActiveAttempt])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (loading) return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl p-4 mb-6 animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="h-6 w-40 rounded" style={{ backgroundColor: 'var(--border)' }} />
        </div>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )

  if (completedExam) return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <CheckCircleIcon className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 text-emerald-500" />
        <h1 className="text-2xl font-bold text-blue-700 mb-2">{t('exam.alreadyCompleted')}</h1>
        <p className="text-gray-500 mb-6">
          {t('exam.alreadyCompletedDesc')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/results')}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('exam.goToResults')}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 border px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            {t('exam.goBack')}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Derived state ──────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const isFirstQuestion = currentIndex === 0
  const isLastQuestion = currentIndex === totalQuestions - 1

  // Check if there's an image media on the current question
  const firstImage = currentQuestion?.media?.find(
    m => m?.mime?.startsWith('image/') || m?.url
  )
  const currentImageSrc = firstImage
    ? (firstImage.url?.startsWith('http') ? firstImage.url : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:1337'}${firstImage.url}`)
    : null
  const hasImage = !!currentImageSrc

  // Array-aware "is this question answered?" check — multiple_choice
  // multi-select stores arrays, everything else stores a string.
  const hasAnswer = (q) => {
    const value = answers[q?.id]
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== null && String(value).trim() !== ''
  }

  const allAnswered = questions.length > 0 && questions.every(hasAnswer)

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    }
  }

  // ── Render active question in the sub-component slot ────────────────────
  function renderQuestionSlot() {
    const q = currentQuestion
    if (!q) return null

    const sharedAnswerProps = {
      selectedValue: answers[q.id] || null,
      onAnswer: (val) => setAnswers(prev => ({ ...prev, [q.id]: val })),
    }

    if (q.type === 'yes_no') {
      return (
        <YesNoQuestion
          questionText={q.text}
          {...sharedAnswerProps}
          onSubmit={() => {
            if (isLastQuestion) {
              handleSubmit()
            } else {
              goNext()
            }
          }}
          canSubmit={!!sharedAnswerProps.selectedValue}
          submitLabel={isLastQuestion ? t('exam.submit') : undefined}
          yesLabel={t('exam.yes')}
          noLabel={t('exam.no')}
        />
      )
    }

    // ── Multiple-select multiple choice (checkbox, array answer) ──────────
    if (q.type === 'multiple_choice') {
      return (
        <div className="flex flex-col gap-8">
          {q.media?.length > 0 && (
            <MediaDisplay media={q.media} />
          )}
          <MultipleChoiceQuestion
            questionText={q.text}
            options={q.options || []}
            multiSelect
            hint={t('exam.selectAll')}
            selectedValue={Array.isArray(answers[q.id]) ? answers[q.id] : []}
            onAnswer={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
            onSubmit={() => {
              if (isLastQuestion) {
                handleSubmit()
              } else {
                goNext()
              }
            }}
            canSubmit={hasAnswer(q)}
            submitLabel={isLastQuestion ? t('exam.submit') : undefined}
          />
        </div>
      )
    }

    // ── Single choice (radio) — like classic multiple choice ──────────────
    if (q.type === 'single_choice') {
      return (
        <div className="flex flex-col gap-8">
          {q.media?.length > 0 && (
            <MediaDisplay media={q.media} />
          )}
          <MultipleChoiceQuestion
            questionText={q.text}
            options={q.options || []}
            {...sharedAnswerProps}
            onSubmit={() => {
              if (isLastQuestion) {
                handleSubmit()
              } else {
                goNext()
              }
            }}
            canSubmit={hasAnswer(q)}
            submitLabel={isLastQuestion ? t('exam.submit') : undefined}
          />
        </div>
      )
    }

    // ── Aka / Ao video question ───────────────────────────────────────────
    if (q.type === 'aka_ao') {
      return (
        <AkaAoQuestion
          questionText={q.text}
          videoAkaUrl={q.videoAkaUrl}
          videoAoUrl={q.videoAoUrl}
          selectedValue={answers[q.id] || null}
          onAnswer={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
          onSubmit={() => {
            if (isLastQuestion) {
              handleSubmit()
            } else {
              goNext()
            }
          }}
          canSubmit={hasAnswer(q)}
          submitLabel={isLastQuestion ? t('exam.submit') : undefined}
          akaLabel={t('exam.aka')}
          aoLabel={t('exam.ao')}
        />
      )
    }

    // ── Fallback for open_text / unknown types ────────────────────────────
    return (
      <div className="flex flex-col gap-8">
        {q.media?.length > 0 && (
          <MediaDisplay media={q.media} />
        )}

        {q.type === 'open_text' && (
          <OpenTextQuestion
            questionText={q.text}
            value={answers[q.id] || ''}
            onChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
            onSubmit={() => {
              if (isLastQuestion) {
                handleSubmit()
              } else {
                goNext()
              }
            }}
            canSubmit={!!(answers[q.id] || '').trim()}
            submitLabel={isLastQuestion ? t('exam.submit') : undefined}
            placeholder={t('exam.typeAnswer')}
          />
        )}

        {/* BUG-007: graceful fallback for unknown question types so the exam
            never dead-ends — the question stays answerable as free text. */}
        {q.type !== 'open_text' && (
          <div className="flex flex-col gap-4">
            <p
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            >
              {t('exam.unsupportedType')}
            </p>
            <OpenTextQuestion
              questionText={q.text}
              value={answers[q.id] || ''}
              onChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
              onSubmit={() => {
                if (isLastQuestion) {
                  handleSubmit()
                } else {
                  goNext()
                }
              }}
              canSubmit={!!(answers[q.id] || '').trim()}
              submitLabel={isLastQuestion ? t('exam.submit') : undefined}
              placeholder={t('exam.typeAnswer')}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Navigation bar ──────────────────────────────────────────────────────
  const navBar = (
    <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={goPrev}
        disabled={isFirstQuestion}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
          disabled:opacity-30 disabled:cursor-not-allowed
          enabled:hover:bg-gray-100 dark:enabled:hover:bg-gray-800"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Previous
      </button>

      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {currentIndex + 1} / {totalQuestions}
      </span>

      {isLastQuestion && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !allAnswered}
          title={!allAnswered ? t('exam.answerFirst') : ''}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            bg-blue-600 text-white shadow-lg shadow-blue-600/20
            hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
            active:scale-[0.98]"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('exam.submitting')}
            </span>
          ) : (
            <>
              {t('exam.submit')}
              <ChevronRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {!isLastQuestion && (
        <button
          type="button"
          onClick={goNext}
          disabled={!hasAnswer(currentQuestion)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            bg-blue-600 text-white shadow-lg shadow-blue-600/20
            hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
            active:scale-[0.98]"
        >
          Next
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  )

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      <ExamQuestionView
        currentQuestion={currentIndex + 1}
        totalQuestions={totalQuestions}
        hasImage={hasImage}
        imageSrc={currentImageSrc}
        imageAlt={currentQuestion?.text || ''}
        canGoBack={!isFirstQuestion}
        onBack={goPrev}
      >
        {/* Save status indicator */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('exam.inProgress')}
          </h1>
          {saveStatus === 'saving' && (
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 font-medium">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500 font-medium">✗ Save failed</span>
          )}
        </div>

        {/* Question progress dots */}
        <QuestionProgressDots
          totalQuestions={totalQuestions}
          currentIndex={currentIndex}
          answers={answers}
          questions={questions}
          onJump={(i) => setCurrentIndex(i)}
        />

        {/* Question sub-component slot */}
        {renderQuestionSlot()}

        {/* Submit error banner — only on the last question */}
        {isLastQuestion && submitError && (
          <div className="mt-6 p-4 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700">
            <p className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {submitError}
            </p>
          </div>
        )}

        {/* Timer + Navigation */}
        <div className="mt-8 flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
          <div>
            {timedOut && !submitError ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold text-sm">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Time's up! Submitting your answers...
              </span>
            ) : timedOut ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold text-sm">
                <ClockIcon className="w-4 h-4" />
                Time's up! Please submit now.
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 text-base font-mono font-semibold ${timeLeft < 60 ? 'text-red-500' : ''}`}>
                <ClockIcon className="w-4 h-4" />
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        {navBar}
      </ExamQuestionView>
    </div>
  )
}
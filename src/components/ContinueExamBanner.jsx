import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useExamAttempt } from '../context/ExamAttemptContext'

export default function ContinueExamBanner() {
  const location = useLocation()
  const { activeAttempt, clearActiveAttempt } = useExamAttempt()

  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  const isAdminRoute = location.pathname.startsWith('/admin')
  const examDocumentId = activeAttempt?.exam?.documentId
  const isExamRoute = examDocumentId && location.pathname === `/exam/${examDocumentId}`

  useEffect(() => {
    let timer

    if (activeAttempt && !activeAttempt.submittedAt && !isAdminRoute && !isExamRoute) {
      setClosing(false)
      setVisible(false)

      timer = setTimeout(() => {
        setVisible(true)
      }, 500)
    } else {
      setVisible(false)
      setClosing(false)
    }

    return () => clearTimeout(timer)
  }, [activeAttempt, isAdminRoute, isExamRoute])

  if (!activeAttempt || activeAttempt.submittedAt || isAdminRoute || isExamRoute || !examDocumentId) {
    return null
  }

  const examTitle = activeAttempt.exam?.title || 'Exam'
  const examPath = `/exam/${examDocumentId}`

  const handleDismiss = () => {
    setClosing(true)
    setTimeout(() => {
      clearActiveAttempt()
      setVisible(false)
      setClosing(false)
    }, 260)
  }

  if (!visible && !closing) return null

  return (
    <div
      className={`fixed left-1/2 top-4 z-50 w-[min(92vw,720px)] -translate-x-1/2 rounded-2xl shadow-lg border px-4 py-3 ${
        closing ? 'animate-banner-out' : 'animate-banner-in'
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Continue exam
            </p>
          </div>

          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            You have an unfinished attempt for{' '}
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {examTitle}
            </span>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={examPath}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Continue
          </Link>

          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-2 rounded-lg border text-sm hover:bg-black/5"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
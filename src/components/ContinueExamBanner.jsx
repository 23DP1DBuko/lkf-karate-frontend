import { Link } from 'react-router-dom'
import { useExamAttempt } from '../context/ExamAttemptContext'

export default function ContinueExamBanner() {
  const { activeAttempt, clearActiveAttempt } = useExamAttempt()

  if (!activeAttempt || activeAttempt.submittedAt) return null

  const examTitle = activeAttempt.exam?.title || 'Exam'
  const examPath = `/exam/${activeAttempt.exam?.documentId}`

  return (
    <div
      className="fixed left-1/2 top-4 z-50 w-[min(92vw,720px)] -translate-x-1/2 rounded-xl shadow-lg border px-4 py-3"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Continue exam
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Unfinished attempt for{' '}
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {examTitle}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={examPath}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            Continue exam
          </Link>

          <button
            type="button"
            onClick={clearActiveAttempt}
            className="px-3 py-2 rounded-lg border text-sm hover:bg-black/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
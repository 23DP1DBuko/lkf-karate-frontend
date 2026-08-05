import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ErrorState({
  title = 'Failed to load data',
  message = 'Something went wrong while loading. Please try again.',
  error,
  onRetry,
  fullPage = false,
}) {
  const container = fullPage
    ? 'flex items-center justify-center min-h-[60vh]'
    : 'flex items-center justify-center py-20'

  return (
    <div className={container}>
      <div className="text-center max-w-md px-6">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        {error && import.meta.env.DEV && (
          <p className="text-xs mb-4 p-2 rounded-lg" style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
          }}>
            {error.message || String(error)}
          </p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}

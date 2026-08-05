// Toast.jsx — Auto-dismissing notification toast
//
// Props:
//   message   — text to display
//   type      — 'success' | 'error' | 'info' (default: 'info')
//   onClose   — called when toast is dismissed
//   duration  — auto-dismiss in ms (default: 5000, set to 0 for no auto-dismiss)

import { useEffect, useState } from 'react'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

const styles = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/40',
    border: 'border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/40',
    border: 'border-red-200 dark:border-red-700',
    text: 'text-red-800 dark:text-red-200',
    icon: <XCircleIcon className="w-5 h-5 text-red-500 dark:text-red-400" />,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/40',
    border: 'border-blue-200 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    icon: <InformationCircleIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
  },
}

export default function Toast({ message, type = 'info', onClose, duration = 5000 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation on next frame
    const enter = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(enter)
  }, [])

  useEffect(() => {
    if (duration <= 0 || !onClose) return
    const timer = setTimeout(() => {
      setVisible(false)
      // Allow exit animation to finish before calling onClose
      setTimeout(onClose, 250)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const s = styles[type] || styles.info

  return (
    <div
      role="alert"
      className={`
        fixed top-5 right-5 z-50 max-w-sm w-full
        flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-lg
        transition-all duration-200 ease-out
        ${s.bg} ${s.border} ${s.text}
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}
      `}
    >
      <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className="flex-shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

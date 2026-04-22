import { useState } from 'react'

export default function IconButton({ icon: Icon, label, onClick, variant = 'default', disabled = false, size = 'md' }) {
  const [showTooltip, setShowTooltip] = useState(false)

  const variants = {
    default: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600',
    danger: 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500',
    success: 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600',
    warning: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600',
  }

  const sizes = {
    sm: 'p-1.5 w-8 h-8',
    md: 'p-2 w-9 h-9',
    lg: 'p-2.5 w-10 h-10',
  }

  return (
    <div className="relative inline-flex">
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`
          relative flex items-center justify-center rounded-lg transition-all duration-150
          active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
          ${variants[variant]} ${sizes[size]}
        `}
        aria-label={label}
      >
        <Icon className="w-4 h-4" />

        {/* Ripple effect on click */}
        <span className="absolute inset-0 rounded-lg overflow-hidden">
          <span className="absolute inset-0 rounded-lg bg-current opacity-0 active:opacity-10 transition-opacity" />
        </span>
      </button>

      {/* Tooltip */}
      {showTooltip && label && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div
            className="px-2 py-1 text-xs rounded-lg whitespace-nowrap shadow-lg animate-fade-in"
            style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
          >
            {label}
          </div>
          <div
            className="w-2 h-2 rotate-45 mx-auto -mt-1"
            style={{ backgroundColor: 'var(--text-primary)' }}
          />
        </div>
      )}
    </div>
  )
}
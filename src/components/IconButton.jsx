import { useState } from 'react'
export default function IconButton(props) {
  const {
    icon,
    label,
    onClick,
    variant = 'default',
    disabled = false,
    size = 'md',
  } = props
  const Icon = icon
  const [tooltipPos, setTooltipPos] = useState(null)
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
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setTooltipPos({ top: rect.top - 25, left: rect.left + rect.width / 2 })
        }}
        onMouseLeave={() => setTooltipPos(null)}
        onFocus={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setTooltipPos({ top: rect.top - 25, left: rect.left + rect.width / 2 })
        }}
        onBlur={() => setTooltipPos(null)}
        className={
          "relative flex items-center justify-center rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}"
        }
        aria-label={label}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span className="absolute inset-0 rounded-lg overflow-hidden">
          <span className="absolute inset-0 rounded-lg bg-current opacity-0 active:opacity-10 transition-opacity" />
        </span>
      </button>
      {tooltipPos && label && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="px-2 py-1 text-xs rounded-lg whitespace-nowrap shadow-lg"
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
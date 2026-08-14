// FileDropzone.jsx — shared drag-and-drop file picker used by MediaUpload and
// the PDF chapter import page. Owns the drag-state feedback, keyboard access,
// and hidden <input>; parents supply the icon, title, hint and onFiles handler.
import { useRef, useState } from 'react'

export default function FileDropzone({
  icon,
  title = 'Drop files here',
  hint,
  showBrowseHint = true,
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  className = '',
  ariaLabel = 'Upload file',
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const openPicker = () => {
    // Reset the input value so re-selecting the same file re-triggers onChange
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.click()
  }

  const renderTitle = typeof title === 'function' ? title(dragging) : title

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openPicker()
        }
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}        onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (disabled) return
        const files = e.dataTransfer.files
        if (files?.length) onFiles?.(files)
      }}
      className={`flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer select-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      } ${dragging
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
        : 'hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/20'
      } ${className}`}
      style={{ borderColor: dragging ? undefined : 'var(--border)' }}
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
          dragging
            ? 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/25'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
        }`}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {renderTitle}
        </p>
        {hint && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </p>
        )}
        {showBrowseHint && !dragging && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            or <span className="text-blue-600 font-medium">browse files</span>
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          if (e.target.files?.length) onFiles?.(e.target.files)
        }}
        disabled={disabled}
        multiple={multiple}
      />
    </div>
  )
}

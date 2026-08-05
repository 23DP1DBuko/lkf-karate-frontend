// OpenTextQuestion.jsx — Polished open-text question with character count and submit button
//
// Props:
//   questionText — the question heading
//   value        — current text value
//   onChange     — called with the new string value
//   onSubmit     — called when the submit button is clicked
//   canSubmit    — enable the submit button (default: true if value is non-empty)
//   isSubmitting — show a loading state on the submit button
//   submitLabel  — custom label for the submit button (default: "Submit Answer")
//   placeholder  — placeholder text for the textarea (default: "Type your answer...")
//   maxLength    — optional max character count
//   rows         — number of visible text rows (default: 4)



export default function OpenTextQuestion({
  questionText,
  value = '',
  onChange,
  onSubmit,
  canSubmit,
  isSubmitting = false,
  submitLabel = 'Submit Answer',
  placeholder = 'Type your answer…',
  maxLength,
  rows = 4,
}) {
  const charCount = (value || '').length

  const handleChange = (e) => {
    const newValue = e.target.value
    if (maxLength !== undefined && newValue.length > maxLength) return
    if (onChange) onChange(newValue)
  }

  const submitEnabled = canSubmit !== undefined ? canSubmit : (value || '').trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Question heading */}
      <h2
        className="text-xl md:text-3xl font-semibold leading-snug tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {questionText}
      </h2>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          className="
            w-full resize-y rounded-2xl px-5 py-4
            border-2 text-base md:text-lg leading-relaxed
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500
            placeholder:opacity-50
          "
          style={{
            backgroundColor: 'var(--input-bg, var(--bg-secondary))',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />

        {/* Character count */}
        <div
          className="absolute bottom-3 right-4 text-xs font-medium tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
          {maxLength !== undefined ? (
            <span className={charCount > maxLength * 0.9 ? 'text-amber-500' : ''}>
              {charCount} / {maxLength}
            </span>
          ) : (
            <span>{charCount} {charCount === 1 ? 'character' : 'characters'}</span>
          )}
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => onSubmit?.()}
          disabled={!submitEnabled || isSubmitting}
          className={`
            w-full sm:w-auto min-w-[200px] px-10 py-3.5 rounded-2xl
            text-base font-semibold tracking-wide
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            active:scale-[0.98]
            ${
              submitEnabled && !isSubmitting
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 cursor-pointer'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting…
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </div>
  )
}

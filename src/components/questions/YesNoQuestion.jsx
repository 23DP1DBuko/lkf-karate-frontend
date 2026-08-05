// YesNoQuestion.jsx — Theme-aware yes/no question card with card-style options
//
// Props:
//   questionText  — the question heading
//   selectedValue — currently selected value ("true" | "false" | null)
//   onAnswer      — called with the new value when user taps an option
//   onSubmit      — called when the submit button is clicked
//   canSubmit     — enable the submit button (default: true if selectedValue is set)
//   isSubmitting  — show a loading state on the submit button
//   submitLabel   — custom label for the submit button (default: "Submit Answer")
//   yesLabel      — custom label for "yes" (default: "Yes")
//   noLabel       — custom label for "no"  (default: "No")


import { CheckIcon } from '@heroicons/react/24/outline'

function OptionCard({ value, label, selected, onSelect }) {
  const isActive = selected === value

  const baseStyle = {
    backgroundColor: isActive ? '#2563eb' : 'var(--bg-card)',
    borderColor: isActive ? '#2563eb' : 'var(--border)',
    color: isActive ? '#ffffff' : 'var(--text-primary)',
    boxShadow: isActive ? '0 10px 15px -3px rgba(37, 99, 235, 0.2)' : 'none',
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      style={baseStyle}
      className={`
        relative flex-1 flex items-center justify-center gap-3 px-6 py-5 rounded-2xl
        border-2 font-semibold text-base md:text-lg
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        active:scale-[0.98]
        ${isActive ? '' : 'hover:shadow-md hover:-translate-y-0.5 hover:border-blue-400'}
      `}
      aria-pressed={isActive}
    >
      {isActive && (
        <CheckIcon className="w-5 h-5 flex-shrink-0 text-white" />
      )}
      <span>{label}</span>
    </button>
  )
}

export default function YesNoQuestion({
  questionText,
  selectedValue,
  onAnswer,
  onSubmit,
  canSubmit,
  isSubmitting = false,
  submitLabel = 'Submit Answer',
  yesLabel = 'Yes',
  noLabel = 'No',
}) {
  const handleSelect = (value) => {
    if (onAnswer) onAnswer(value)
  }

  const submitEnabled = canSubmit !== undefined ? canSubmit : selectedValue !== null

  return (
    <div className="flex flex-col gap-8">
      {/* Question heading */}
      <h2 className="text-xl md:text-3xl font-semibold leading-snug tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {questionText}
      </h2>

      {/* Yes / No option cards */}
      <div className="flex flex-col sm:flex-row gap-4">
        <OptionCard
          value="true"
          label={yesLabel}
          selected={selectedValue}
          onSelect={handleSelect}
        />
        <OptionCard
          value="false"
          label={noLabel}
          selected={selectedValue}
          onSelect={handleSelect}
        />
      </div>

      {/* Submit button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => onSubmit?.()}
          disabled={!submitEnabled || isSubmitting}
          style={{
            backgroundColor: submitEnabled && !isSubmitting ? '#2563eb' : 'var(--bg-secondary)',
            color: submitEnabled && !isSubmitting ? '#ffffff' : 'var(--text-muted)',
            boxShadow: submitEnabled && !isSubmitting ? '0 10px 15px -3px rgba(37, 99, 235, 0.2)' : 'none',
            cursor: submitEnabled && !isSubmitting ? 'pointer' : 'not-allowed',
          }}
          className={`
            w-full sm:w-auto min-w-[200px] px-10 py-3.5 rounded-2xl
            text-base font-semibold tracking-wide
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            active:scale-[0.98]
            ${submitEnabled && !isSubmitting ? 'hover:bg-blue-700 hover:shadow-xl' : ''}
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

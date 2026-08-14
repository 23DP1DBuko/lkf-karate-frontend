// MultipleChoiceQuestion.jsx — Theme-aware card-style choice question component
//
// Single-select mode (default):
//   selectedValue — string | null, taps replace the selection
// Multi-select mode (multiSelect):
//   selectedValue — array of strings, taps toggle options in/out
//
// Props:
//   questionText  — the question heading
//   options       — array of option strings
//   multiSelect   — true renders checkboxes and expects array answers
//   selectedValue — string | null (single) or string[] (multi)
//   onAnswer      — called with the new value when user taps an option
//   onSubmit      — called when the submit button is clicked
//   canSubmit     — enable the submit button (default: true if a value is selected)
//   isSubmitting  — show a loading state on the submit button
//   submitLabel   — custom label for the submit button (default: "Submit Answer")


import { CheckIcon } from '@heroicons/react/24/outline'

function OptionCard({ value, label, selected, multiSelect, onSelect }) {
  const isActive = multiSelect
    ? Array.isArray(selected) && selected.includes(value)
    : selected === value

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
        relative flex items-center gap-4 w-full px-5 py-4 rounded-2xl
        border-2 font-medium text-base md:text-lg text-left
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        active:scale-[0.98]
        ${isActive ? '' : 'hover:shadow-md hover:-translate-y-0.5 hover:border-blue-400'}
      `}
      aria-pressed={isActive}
    >
      {/* Radio / checkbox indicator */}
      <span
        style={{
          borderColor: isActive ? '#ffffff' : 'var(--text-muted)',
          backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
        }}
        className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition ${
          multiSelect ? 'rounded-md' : 'rounded-full'
        }`}
      >
        {isActive && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
      </span>

      {/* Option text */}
      <span className="flex-1">{label}</span>

      {/* Check icon for selected state */}
      {isActive && (
        <CheckIcon className="w-5 h-5 flex-shrink-0 text-white" />
      )}
    </button>
  )
}

export default function MultipleChoiceQuestion({
  questionText,
  options = [],
  multiSelect = false,
  selectedValue,
  onAnswer,
  onSubmit,
  canSubmit,
  isSubmitting = false,
  submitLabel = 'Submit Answer',
  hint,
}) {
  const handleSelect = (value) => {
    if (!onAnswer) return
    if (!multiSelect) {
      onAnswer(value)
      return
    }
    // Multi-select: toggle the option in/out of the array
    const current = Array.isArray(selectedValue) ? selectedValue : []
    onAnswer(
      current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
    )
  }

  const hasSelection = multiSelect
    ? Array.isArray(selectedValue) && selectedValue.length > 0
    : selectedValue !== null && selectedValue !== undefined

  const submitEnabled = canSubmit !== undefined ? canSubmit : hasSelection

  return (
    <div className="flex flex-col gap-8">
      {/* Question heading */}
      <h2
        className="text-xl md:text-3xl font-semibold leading-snug tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {questionText}
      </h2>

      {/* Option cards */}
      <div className="flex flex-col gap-3">
        {multiSelect && (
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            {hint || 'Select all that apply'}
          </p>
        )}
        {options.map((option) => (
          <OptionCard
            key={option}
            value={option}
            label={option}
            selected={selectedValue}
            multiSelect={multiSelect}
            onSelect={handleSelect}
          />
        ))}
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

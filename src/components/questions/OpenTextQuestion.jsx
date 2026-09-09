// OpenTextQuestion.jsx — Open-text question with N labelled answer fields
//
// Each answer field is a labelled text input ("Answer 1", "Answer 2", …) so
// students can tab through the fields naturally (Tab / Shift+Tab). The number
// of fields is configured by the administrator and must match the expected
// answer count (e.g. 6 criteria → 6 fields).
//
// Props:
//   questionText  — the question heading
//   value         — array of field values (strings); legacy strings accepted
//   fieldCount    — number of answer fields to render (default 1)
//   onChange      — called with the new array of field values
//   onSubmit      — called when the submit button is clicked
//   canSubmit     — enable the submit button
//   isSubmitting  — show a loading state on the submit button
//   submitLabel   — custom label for the submit button
//   placeholder   — placeholder text for each input
//   getFieldLabel — (index) => label text, e.g. (i) => t('exam.answerField', { n: i + 1 })
//   instruction   — optional helper line above the fields
//   id            — unique prefix for input ids (label htmlFor) — pass the question id

function normalizeValues(value, count) {
  const raw = Array.isArray(value)
    ? value
    : value == null
      ? []
      : [String(value)]
  return Array.from({ length: count }, (_, i) => raw[i] ?? '')
}

export default function OpenTextQuestion({
  questionText,
  value,
  fieldCount = 1,
  onChange,
  onSubmit,
  canSubmit,
  isSubmitting = false,
  submitLabel = 'Submit Answer',
  placeholder = 'Type your answer…',
  getFieldLabel,
  instruction,
  id = 'open-text',
}) {
  const count = Math.max(1, Number(fieldCount) || 1)
  const fields = normalizeValues(value, count)

  const handleChange = (i, newValue) => {
    const next = [...fields]
    next[i] = newValue
    if (onChange) onChange(next)
  }

  const anyFilled = fields.some(v => String(v ?? '').trim() !== '')
  const submitEnabled = canSubmit !== undefined ? canSubmit : anyFilled

  return (
    <div className="flex flex-col gap-6">
      {/* Question heading */}
      <h2
        className="text-xl md:text-3xl font-semibold leading-snug tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {questionText}
      </h2>

      {instruction && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {instruction}
        </p>
      )}

      {/* Answer fields — one labelled input per expected answer */}
      <div className="flex flex-col gap-4">
        {fields.map((fieldValue, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <label
              htmlFor={`${id}-field-${i}`}
              className="text-sm font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              {getFieldLabel ? getFieldLabel(i) : `Answer ${i + 1}`}
            </label>
            <input
              id={`${id}-field-${i}`}
              type="text"
              value={fieldValue}
              onChange={e => handleChange(i, e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className="
                w-full rounded-2xl px-4 py-3
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
          </div>
        ))}
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
import { useMemo, useState } from 'react'

function pad(n) {
  return String(n).padStart(2, '0')
}

function toLocalDateParts(value) {
  if (!value) return { date: '', hour: '00', minute: '00' }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { date: '', hour: '00', minute: '00' }

  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hour: pad(d.getHours()),
    minute: pad(d.getMinutes()),
  }
}

function buildLocalISOString(date, hour, minute) {
  if (!date) return ''
  const local = new Date(`${date}T${hour || '00'}:${minute || '00'}:00`)
  return Number.isNaN(local.getTime()) ? '' : local.toISOString()
}

export default function DateTimeStepPicker({
  label,
  value,
  onChange,
  error,
  mode = 'datetime',
  requiredTime = true,
  minuteStep = 5,
}) {
  const [step, setStep] = useState('date')

  const parsed = useMemo(() => toLocalDateParts(value), [value])

  // Derive effective step — clamp to 'date' when mode/date constraints apply
  const effectiveStep = (mode === 'dateOnly' || !parsed.date) ? 'date' : step

  const emit = (date, hour, minute) => {
    if (!date) {
      onChange('')
      return
    }

    if (mode === 'dateOnly' || !requiredTime) {
      onChange(buildLocalISOString(date, '00', '00'))
      return
    }

    onChange(buildLocalISOString(date, hour, minute))
  }

  const minuteOptions = useMemo(() => {
    const stepSize = Math.max(1, Number(minuteStep) || 5)
    const list = []
    for (let i = 0; i < 60; i += stepSize) {
      list.push(pad(i))
    }
    return list
  }, [minuteStep])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</label>

      <div
        className="rounded-2xl p-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        {mode !== 'dateOnly' && (
          <div
            className="mb-3 flex gap-1.5 p-1 rounded-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <button
              type="button"
              onClick={() => setStep('date')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                effectiveStep === 'date'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:opacity-70'
              }`}
              style={effectiveStep !== 'date' ? { color: 'var(--text-secondary)' } : {}}
            >
              Date
            </button>
            <button
              type="button"
              onClick={() => setStep('time')}
              disabled={!parsed.date || (mode === 'dateOnly')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                effectiveStep === 'time'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:opacity-70'
              } ${
                !parsed.date ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              style={effectiveStep !== 'time' ? { color: 'var(--text-secondary)' } : {}}
            >
              Time
            </button>
          </div>
        )}

        {(mode === 'dateOnly' || effectiveStep === 'date') && (
          <input
            type="date"
            value={parsed.date}
            onChange={(e) => emit(e.target.value, parsed.hour, parsed.minute)}
            className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            style={{
              backgroundColor: 'var(--input-bg, var(--bg-secondary))',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        )}

        {mode !== 'dateOnly' && effectiveStep === 'time' && (
          <div className="grid grid-cols-2 gap-3">
            <select
              value={parsed.hour}
              onChange={(e) => emit(parsed.date, e.target.value, parsed.minute)}
              className="rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              style={{
                backgroundColor: 'var(--input-bg, var(--bg-secondary))',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {Array.from({ length: 24 }, (_, i) => pad(i)).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <select
              value={parsed.minute}
              onChange={(e) => emit(parsed.date, parsed.hour, e.target.value)}
              className="rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              style={{
                backgroundColor: 'var(--input-bg, var(--bg-secondary))',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {minuteOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>}
    </div>
  )
}
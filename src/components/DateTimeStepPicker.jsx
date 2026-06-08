import { useMemo, useState, useEffect } from 'react'

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

  useEffect(() => {
    if (mode === 'dateOnly') setStep('date')
    if (!parsed.date) setStep('date')
  }, [mode, parsed.date])

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
      <label className="block text-sm font-medium text-slate-200">{label}</label>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-3">
        {mode !== 'dateOnly' && (
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setStep('date')}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                step === 'date' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Date
            </button>
            <button
              type="button"
              onClick={() => setStep('time')}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                step === 'time' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
              disabled={!parsed.date || (mode === 'dateOnly')}
            >
              Time
            </button>
          </div>
        )}

        {(mode === 'dateOnly' || step === 'date') && (
          <input
            type="date"
            value={parsed.date}
            onChange={(e) => emit(e.target.value, parsed.hour, parsed.minute)}
            className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-slate-100"
          />
        )}

        {mode !== 'dateOnly' && step === 'time' && (
          <div className="grid grid-cols-2 gap-3">
            <select
              value={parsed.hour}
              onChange={(e) => emit(parsed.date, e.target.value, parsed.minute)}
              className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-slate-100"
            >
              {Array.from({ length: 24 }, (_, i) => pad(i)).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <select
              value={parsed.minute}
              onChange={(e) => emit(parsed.date, parsed.hour, e.target.value)}
              className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-slate-100"
            >
              {minuteOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-red-400">{error}</p>}
    </div>
  )
}
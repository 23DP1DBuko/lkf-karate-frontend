// StatusChip.jsx — one status pill for every admin table.
//
// The old pills were light fills (bg-green-100 …) which read as bright blocks on the
// dark surface, and each table carried its own palette. This ships one tinted chip:
// the tone colour at 10% alpha with a 1px border at 25%, so a table of statuses stays
// quiet. The label is always rendered as text, so status is never colour-only.
//
// Props:
//   status    — app status value (see STATUS_TONES); also the fallback label
//   tone      — explicit tone override: success | warning | danger | info | neutral
//   label     — visible text (defaults to `status`)
//   size      — 'sm' | 'md'
//   className — layout-only additions (margins, alignment)

const TONES = {
  success:
    'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 dark:border-emerald-400/30',
  warning:
    'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300 dark:border-amber-400/30',
  danger:
    'bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-300 dark:border-red-400/30',
  info:
    'bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300 dark:border-blue-400/30',
  neutral:
    'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300 dark:border-slate-400/25',
}

// Every status the admin tables actually render. Keep this list to values that exist
// in the data model — an unknown value falls back to `neutral`, never to a missing class.
const STATUS_TONES = {
  // exam window
  scheduled: 'warning',
  open: 'success',
  closed: 'neutral',
  // content publication
  published: 'success',
  draft: 'neutral',
  // account verification
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  // exam attempts
  in_progress: 'info',
  submitted: 'success',
  expired: 'danger',
  abandoned: 'warning',
  // results
  passed: 'success',
  failed: 'danger',
}

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export default function StatusChip({ status, tone, label, size = 'md', className = '' }) {
  const resolvedTone = TONES[tone] ? tone : STATUS_TONES[status] || 'neutral'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap ${TONES[resolvedTone]} ${SIZES[size] || SIZES.md} ${className}`}
    >
      {label ?? status}
    </span>
  )
}

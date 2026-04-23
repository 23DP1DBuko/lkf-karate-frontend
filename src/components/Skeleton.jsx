export function SkeletonCard() {
  return (
    <div className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 rounded w-32" style={{ backgroundColor: 'var(--border)' }} />
        <div className="h-5 rounded-full w-16" style={{ backgroundColor: 'var(--border)' }} />
      </div>
      <div className="h-4 rounded w-full mb-2" style={{ backgroundColor: 'var(--border)' }} />
      <div className="h-4 rounded w-2/3" style={{ backgroundColor: 'var(--border)' }} />
    </div>
  )
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 animate-pulse flex items-center gap-4"
          style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--border)' }} />
            <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--border)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="h-4 rounded w-32 animate-pulse" style={{ backgroundColor: 'var(--border)' }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 rounded flex-1" style={{ backgroundColor: 'var(--border)' }} />
          ))}
        </div>
      ))}
    </div>
  )
}
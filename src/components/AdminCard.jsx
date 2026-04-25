export default function AdminCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  )
}
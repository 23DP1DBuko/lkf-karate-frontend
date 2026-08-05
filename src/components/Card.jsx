/**
 * Card wrapper — applies the project's standard card background and border
 * colors via CSS variables:
 *   - background-color: var(--bg-card)
 *   - border-color: var(--border)
 *
 * Props:
 *   className — additional Tailwind classes (e.g. "rounded-2xl shadow-lg p-6")
 *   style     — optional inline style overrides (merged on top of defaults)
 *   children  — card content
 *   ...props  — any other div attributes (onClick, key, etc.)
 */
export default function Card({ as: Tag = 'div', className = '', style, children, ...props }) {
  return (
    <Tag
      className={className}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}

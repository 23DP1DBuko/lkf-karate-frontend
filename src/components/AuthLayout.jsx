import { Link } from 'react-router-dom'
import { useTheme } from '../context/useTheme'

export default function AuthLayout({ children, title, subtitle }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const bgColor = isDark ? '#03010A' : '#f1f5f9'

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4" style={{ backgroundColor: bgColor }}>

      {/* Back to home link - top left */}
      <Link
        to="/"
        className={`fixed top-6 left-6 z-10 flex items-center gap-1.5 text-xs transition-colors ${
          isDark ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-500'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </Link>

      {/* Brand - top center */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${
          isDark ? 'bg-white/[0.06] border-white/[0.06]' : 'bg-indigo-50 border-indigo-200/40'
        }`}>
          <span className="text-indigo-400 font-bold text-xs">LKF</span>
        </div>
        <span className={`text-sm font-semibold tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Academy</span>
      </div>

      {/* Glassmorphism card */}
      <div className={`relative z-10 w-full max-w-md backdrop-blur-xl border rounded-2xl p-8 shadow-2xl space-y-6 ${
        isDark
          ? 'bg-white/[0.02] border-white/[0.08]'
          : 'bg-white/60 border-slate-200/60'
      }`}>
        {title && (
          <h1 className={`text-xl font-bold text-left ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p className={`text-sm text-left -mt-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}

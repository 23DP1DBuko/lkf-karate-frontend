import { Link } from 'react-router-dom'
import MobileNav from './MobileNav'

export default function LandingHeader({ isDark = true, children }) {
  return (
    <header className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b transition-all ${
      isDark ? 'bg-slate-900/40 border-white/[0.06]' : 'bg-white/70 border-slate-200/60'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <div className={`w-8 h-8 rounded-lg backdrop-blur-sm flex items-center justify-center border ${
            isDark ? 'bg-white/10 border-white/[0.08]' : 'bg-blue-50 border-blue-300/50'
          }`}>
            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-blue-600'}`}>LKF</span>
          </div>
          <span className={`font-bold text-base tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Academy</span>
        </Link>

        {children && (
          <div className="hidden md:flex items-center gap-2">
            {children}
          </div>
        )}

        <div className="md:hidden">
          <MobileNav isDark={isDark} />
        </div>
      </div>
    </header>
  )
}

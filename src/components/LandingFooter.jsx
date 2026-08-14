import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function LandingFooter({ isDark = true }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <footer className={`border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-200/60'}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Links row */}
        <div className={`flex items-center justify-center gap-3 md:gap-5 text-xs ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <Link
            to="/rules"
            aria-current={pathname === '/rules' ? 'page' : undefined}
            className="hover:text-blue-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {t('landing.rules')}
          </Link>
          <span className={`select-none ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
          <Link
            to="/privacy"
            aria-current={pathname === '/privacy' ? 'page' : undefined}
            className="hover:text-blue-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {t('landing.privacyPolicy')}
          </Link>
          <span className={`select-none ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
          <Link
            to="/terms"
            aria-current={pathname === '/terms' ? 'page' : undefined}
            className="hover:text-blue-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {t('landing.termsOfService')}
          </Link>
          <span className={`select-none ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
          <Link
            to="/gdpr"
            aria-current={pathname === '/gdpr' ? 'page' : undefined}
            className="hover:text-blue-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {t('landing.gdpr')}
          </Link>
        </div>

        {/* Separator */}
        <div className={`my-4 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200/50'}`} />

        {/* Copyright */}
        <p className={`text-[11px] text-center tracking-wider ${
          isDark ? 'text-slate-500' : 'text-slate-600'
        }`}>
          &copy; 2026 LKF Academy
        </p>
      </div>
    </footer>
  )
}

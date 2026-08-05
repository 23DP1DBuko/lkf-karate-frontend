import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'
import { useTranslation } from 'react-i18next'
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'

/* ── Inline SVG flag icons ── */

function FlagLV() {
  return (
    <svg className="w-5 h-5 rounded-full flex-shrink-0" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="10" fill="#9e3039" />
      <rect x="0" y="7" width="20" height="6" fill="#ffffff" />
    </svg>
  )
}

function FlagRU() {
  return (
    <svg className="w-5 h-5 rounded-full flex-shrink-0" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="10" fill="#ffffff" />
      <rect x="0" y="0" width="20" height="7" rx="3" fill="#ffffff" />
      <rect x="0" y="13" width="20" height="7" rx="3" fill="#d52b1e" />
      <clipPath id="ru-clip"><rect width="20" height="20" rx="10" /></clipPath>
      <g clipPath="url(#ru-clip)">
        <rect x="0" y="0" width="20" height="7" fill="#ffffff" />
        <rect x="0" y="7" width="20" height="6" fill="#0039a6" />
        <rect x="0" y="13" width="20" height="7" fill="#d52b1e" />
      </g>
    </svg>
  )
}

function FlagGB() {
  return (
    <svg className="w-5 h-5 rounded-full flex-shrink-0" viewBox="0 0 20 20" fill="none">
      <clipPath id="gb-clip"><rect width="20" height="20" rx="10" /></clipPath>
      <g clipPath="url(#gb-clip)">
        <rect width="20" height="20" fill="#012169" />
        <path d="M0 0l20 20M20 0L0 20" stroke="#ffffff" strokeWidth="4" />
        <path d="M0 0l20 20M20 0L0 20" stroke="#c8102e" strokeWidth="2" />
        <rect y="8" width="20" height="4" fill="#ffffff" />
        <rect y="8.5" width="20" height="3" fill="#c8102e" />
        <rect x="8" width="4" height="20" fill="#ffffff" />
        <rect x="8.5" width="3" height="20" fill="#c8102e" />
      </g>
    </svg>
  )
}

const languageOptions = [
  { code: 'lv', label: 'Latviešu', Flag: FlagLV },
  { code: 'ru', label: 'Русский', Flag: FlagRU },
  { code: 'en', label: 'English', Flag: FlagGB },
]

/* ── Theme pill ── */
function ThemePill({ label, icon: Icon, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'transition-all duration-200 rounded-lg font-medium text-xs md:text-sm py-2 px-3 flex items-center justify-center gap-2',
        isActive
          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm dark:bg-gradient-to-r dark:from-blue-600 dark:to-blue-500 dark:text-white dark:border-blue-400/20 dark:shadow-blue-600/10'
          : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-300 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.1] border border-transparent',
      ].join(' ')}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  )
}

/* ── Language pill ── */
function LanguagePill({ label, Flag, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'transition-all duration-200 rounded-lg font-medium text-xs md:text-sm py-2 px-3 flex items-center justify-center gap-2',
        isActive
          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm dark:bg-gradient-to-r dark:from-blue-600 dark:to-blue-500 dark:text-white dark:border-blue-400/20 dark:shadow-blue-600/10'
          : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-300 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.1] border border-transparent',
      ].join(' ')}
    >
      <Flag />
      <span>{label}</span>
    </button>
  )
}

/* ── Main component ── */
export default function SettingsAppearance() {
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { user, updatePreferences } = useAuth()

  const themeOptions = [
    { value: 'light', label: t('profile.light') || 'Gaišs', icon: SunIcon },
    { value: 'dark', label: t('profile.dark') || 'Tumšs', icon: MoonIcon },
    { value: 'system', label: t('profile.system') || 'Sistēma', icon: ComputerDesktopIcon },
  ]

  return (
    <div className="space-y-6">
      {/* ── Theme section ── */}
      <div className="space-y-2">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {t('profile.theme')}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('profile.themeDesc') || 'Izvēlies vēlamo izskatu'}
          </p>
        </div>

        <div className={`grid grid-cols-3 gap-2 w-full p-1.5 rounded-xl border mt-3 ${
          theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
            ? 'bg-white/[0.04] border-white/[0.06]'
            : 'bg-white/60 border-slate-200/40'
        }`}>
          {themeOptions.map(opt => (
            <ThemePill
              key={opt.value}
              value={opt.value}
              label={opt.label}
              icon={opt.icon}
              isActive={theme === opt.value}
              onClick={() => {
                setTheme(opt.value)
                if (user?.id) {
                  updatePreferences({ themePreference: opt.value })
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Language section ── */}
      <div className="space-y-2">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {t('profile.languageLabel') || 'Valoda'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('profile.languageDesc') || 'Choose your interface language'}
          </p>
        </div>

        <div className={`grid grid-cols-3 gap-2 w-full p-1.5 rounded-xl border mt-3 ${
          theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
            ? 'bg-white/[0.04] border-white/[0.06]'
            : 'bg-white/60 border-slate-200/40'
        }`}>
          {languageOptions.map(opt => (
            <LanguagePill
              key={opt.code}
              code={opt.code}
              label={opt.label}
              Flag={opt.Flag}
              isActive={i18n.language === opt.code}
              onClick={() => {
                i18n.changeLanguage(opt.code)
                localStorage.setItem('language', opt.code)
                if (user?.id) {
                  updatePreferences({ language: opt.code })
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

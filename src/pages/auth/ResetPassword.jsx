import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/useTheme'
import AuthLayout from '../../components/AuthLayout'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function ResetPassword() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const code = searchParams.get('code')

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputClasses = `w-full border transition-all outline-none rounded-xl pl-10 text-sm ${
    isDark
      ? 'bg-white/[0.04] border-white/[0.1] focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 text-slate-700 placeholder-slate-400'
  }`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError(t('profile.passwordMinLength')); return }
    if (!/[A-Z]/.test(form.password)) { setError(t('profile.passwordUppercase')); return }
    if (!/[0-9]/.test(form.password)) { setError(t('profile.passwordNumber')); return }
    if (form.password !== form.confirmPassword) { setError(t('profile.passwordMatch')); return }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        code, password: form.password, passwordConfirmation: form.confirmPassword,
      })
      navigate('/login', { state: { message: t('auth.passwordResetSuccess') } })
    } catch {
      setError(t('auth.invalidResetLinkDesc'))
    } finally {
      setLoading(false)
    }
  }

  if (!code) {
    return (
      <AuthLayout>
        <div className="text-center space-y-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
            isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
          }`}>
            <svg className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t('auth.invalidResetLink')}</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('auth.invalidResetLinkDesc')}</p>
          <Link to="/forgot-password" className={`text-sm transition-colors font-medium ${
            isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-500 hover:text-indigo-600'
          }`}>
            {t('auth.requestNewLink')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.resetPasswordTitle')} subtitle={t('auth.resetPasswordDesc')}>
      {error && (
        <div className={`px-4 py-2.5 rounded-xl text-sm ${
          isDark
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="password">{t('auth.newPasswordLabel')}</label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              className={inputClasses + ' pr-11 py-3'}
              placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
              {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
          <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('profile.passwordHint')}</p>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="confirmPassword">{t('auth.confirmPasswordLabel')}</label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input id="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              className={inputClasses + ' pr-4 py-3'}
              placeholder="••••••••"
              value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('auth.resetting')}
            </span>
          ) : t('auth.resetPasswordButton')}
        </button>
      </form>
    </AuthLayout>
  )
}
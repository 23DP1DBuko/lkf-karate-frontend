import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/useTheme'
import AuthLayout from '../../components/AuthLayout'
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputClasses = `w-full border transition-all outline-none rounded-xl pl-10 text-sm transition-all ${
    isDark
      ? 'bg-white/[0.04] border-white/[0.1] focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 text-slate-700 placeholder-slate-400'
  }`

  const inputPassClasses = `w-full border transition-all outline-none rounded-xl pl-10 pr-11 text-sm ${
    isDark
      ? 'bg-white/[0.04] border-white/[0.1] focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 text-slate-700 placeholder-slate-400'
  }`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.identifier, form.password)
      navigate('/dashboard')
    } catch {
      setError(t('auth.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('auth.signIn')}>
      {state?.message && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-sm">
          {state.message}
        </div>
      )}
      {error && (
        <div className={`px-4 py-2.5 rounded-xl text-sm ${
          isDark
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="email">{t('auth.email')}</label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input id="email" type="email" autoComplete="email"
              className={inputClasses + ' pr-4 py-3'}
              placeholder="your@email.com"
              value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="password">{t('auth.password')}</label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
              className={inputPassClasses + ' py-3'}
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
        </div>
        <p className="text-right -mt-2">
          <Link to="/forgot-password" className={`text-xs transition-colors ${
            isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'
          }`}>{t('auth.forgotPassword')}</Link>
        </p>
        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('auth.signingIn')}
            </span>
          ) : t('auth.signIn')}
        </button>
      </form>

      <p className={`text-xs text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {t('auth.noAccount')}{' '}
        <Link to="/register" className={`transition-colors font-medium ${
          isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
        }`}>{t('auth.signUp')}</Link>
      </p>
    </AuthLayout>
  )
}
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/useTheme'
import AuthLayout from '../../components/AuthLayout'
import { EnvelopeIcon, LockClosedIcon, UserIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

function validate(form, t) {
  const errors = {}
  if (!form.firstName.trim()) errors.firstName = t('auth.firstNameRequired')
  if (!form.lastName.trim()) errors.lastName = t('auth.lastNameRequired')
  if (!form.username.trim()) errors.username = t('auth.usernameRequired')
  else if (form.username.length < 3) errors.username = t('auth.usernameMinLength')
  else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errors.username = t('auth.usernameInvalidChars')
  if (!form.email.trim()) errors.email = t('auth.emailRequired')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = t('auth.emailInvalid')
  if (!form.password) errors.password = t('auth.passwordRequired')
  else if (form.password.length < 8) errors.password = t('profile.passwordMinLength')
  else if (!/[A-Z]/.test(form.password)) errors.password = t('profile.passwordUppercase')
  else if (!/[0-9]/.test(form.password)) errors.password = t('profile.passwordNumber')
  return errors
}

function Field({ id, label, type = 'text', value, onChange, error, icon: Icon, placeholder, isDark }) {
  const fieldClasses = `w-full border transition-all outline-none rounded-xl pl-10 pr-4 py-3 text-sm ${
    isDark
      ? 'bg-white/[0.04] placeholder-slate-500 text-slate-100'
      : 'bg-white placeholder-slate-400 text-slate-700'
  } ${
    error
      ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/60'
      : isDark
        ? 'border-white/[0.1] focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80'
        : 'border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40'
  }`

  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} htmlFor={id}>{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />}
        <input id={id} type={type}
          className={fieldClasses}
          placeholder={placeholder}
          value={value} onChange={onChange} />
      </div>
      {error && <p className={`text-xs mt-1.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{error}</p>}
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '', password: ''
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const passInputClasses = `w-full border transition-all outline-none rounded-xl pl-10 pr-11 py-3 text-sm ${
    isDark
      ? 'bg-white/[0.04] placeholder-slate-500 text-slate-100'
      : 'bg-white placeholder-slate-400 text-slate-700'
  } ${
    errors.password
      ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/60'
      : isDark
        ? 'border-white/[0.1] focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80'
        : 'border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40'
  }`

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate(form, t)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      await register(form.username, form.email, form.password, form.firstName, form.lastName)
      navigate('/dashboard')
    } catch (err) {
      const message = err.response?.data?.error?.message || ''
      if (message.includes('Email')) {
        setErrors({ email: t('auth.registrationFailed') })
      } else if (message.includes('username')) {
        setErrors({ username: t('auth.registrationFailed') })
      } else {
        setErrors({ general: t('auth.registrationFailed') })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('auth.createAccount')}>
      {errors.general && (
        <div className={`px-4 py-2.5 rounded-xl text-sm ${
          isDark
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>{errors.general}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-3">
          <div className="flex-1">
            <Field id="firstName" label={t('auth.firstName')} value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })} error={errors.firstName}
              icon={UserIcon} placeholder="Jānis" isDark={isDark} />
          </div>
          <div className="flex-1">
            <Field id="lastName" label={t('auth.lastName')} value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })} error={errors.lastName}
              icon={UserIcon} placeholder="Bērziņš" isDark={isDark} />
          </div>
        </div>

        <Field id="username" label={t('auth.username')} value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })} error={errors.username}
          icon={UserIcon} placeholder="janis.berzins" isDark={isDark} />

        <Field id="email" label={t('auth.email')} type="email" value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} error={errors.email}
          icon={EnvelopeIcon} placeholder="janis@example.com" isDark={isDark} />

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="password">{t('auth.password')}</label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              className={passInputClasses}
              placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
              {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className={`text-xs mt-1.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{errors.password}</p>}
          <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('profile.passwordHint')}</p>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('auth.creatingAccount')}
            </span>
          ) : t('auth.signUp')}
        </button>
      </form>

      <p className={`text-xs text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className={`transition-colors font-medium ${
          isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
        }`}>{t('auth.signIn')}</Link>
      </p>
    </AuthLayout>
  )
}
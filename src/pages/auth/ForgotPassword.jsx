import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/useTheme'
import AuthLayout from '../../components/AuthLayout'
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import Toast from '../../components/Toast'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const inputClasses = `w-full border transition-all outline-none rounded-xl pl-10 pr-4 py-3 text-sm ${
    isDark
      ? 'bg-white/[0.04] border-white/[0.1] focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 text-slate-700 placeholder-slate-400'
  }`

  const dismissToast = () => setToast(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setToast(null)
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      const status = err?.response?.status
      const errorMsg = err?.response?.data?.error?.message || ''
      if (!err.response) {
        setToast({ message: t('auth.forgotPasswordNetworkError'), type: 'error' })
      } else if (status === 400 && errorMsg.toLowerCase().includes('not found')) {
        setToast({ message: t('auth.forgotPasswordEmailNotFound'), type: 'error' })
      } else if (status === 429) {
        setToast({ message: t('auth.forgotPasswordRateLimit'), type: 'error' })
      } else {
        setToast({ message: t('auth.forgotPasswordServerError'), type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center space-y-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
            isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
          }`}>
            <svg className={`w-8 h-8 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t('auth.forgotPasswordSentTitle')}</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('auth.forgotPasswordSentDesc')}</p>
          <p className={`text-sm font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{email}</p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('auth.forgotPasswordSentHint')}</p>
          <Link to="/login" className={`inline-flex items-center gap-1.5 text-sm transition-colors font-medium ${
            isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
          }`}>
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            {t('auth.backToSignIn')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.forgotPasswordTitle')} subtitle={t('auth.forgotPasswordDesc')}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="email">{t('auth.email')}</label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input id="email" type="email" autoComplete="email"
              className={inputClasses}
              placeholder="your@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
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
              {t('auth.forgotPasswordSending')}
            </span>
          ) : t('auth.forgotPasswordButton')}
        </button>
      </form>

      <p className={`text-xs text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <Link to="/login" className={`inline-flex items-center gap-1.5 text-sm transition-colors font-medium ${
          isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
        }`}>
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          {t('auth.backToSignIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}
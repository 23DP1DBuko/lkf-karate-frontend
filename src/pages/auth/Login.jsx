/* Login.jsx */
import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const { t } = useTranslation()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.identifier, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(t('auth.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" role="main" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="p-8 rounded-xl shadow-md w-full max-w-md" style={{ backgroundColor: 'var(--bg-card)' }}>
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">LKF Karate LMS</h1>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('auth.signIn')}</h2>

        {state?.message && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4 text-sm">{state.message}</div>
        )}
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email" style={{ color: 'var(--text-primary)' }}>{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.identifier}
              onChange={e => setForm({ ...form, identifier: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password" style={{ color: 'var(--text-primary)' }}>{t('auth.password')}</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <p className="text-right">
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline py-2 inline-block">
              {t('auth.forgotPassword')}
            </Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <p className="text-sm text-center mt-4" style={{ color: 'var(--text-secondary)' }}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-blue-600 hover:underline">{t('auth.signUp')}</Link>
        </p>
      </div>
    </div>
  )
}
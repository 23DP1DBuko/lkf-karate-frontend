/* Register.jsx */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'

function validate(form) {
  const errors = {}
  if (!form.firstName.trim()) errors.firstName = 'First name is required'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required'
  if (!form.username.trim()) errors.username = 'Username is required'
  else if (form.username.length < 3) errors.username = 'Username must be at least 3 characters'
  else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errors.username = 'Username can only contain letters, numbers and underscores'
  if (!form.email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address'
  if (!form.password) errors.password = 'Password is required'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters'
  else if (!/[A-Z]/.test(form.password)) errors.password = 'Password must contain at least one uppercase letter'
  else if (!/[0-9]/.test(form.password)) errors.password = 'Password must contain at least one number'
  return errors
}

function Field({ id, label, type = 'text', value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400' : ''}`}
        value={value}
        onChange={onChange}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '', password: ''
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate(form)
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
    <div className="min-h-screen flex items-center justify-center" role="main" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="p-8 rounded-xl shadow-md w-full max-w-md" style={{ backgroundColor: 'var(--bg-card)' }}>
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">LKF Karate LMS</h1>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('auth.createAccount')}</h2>

        {errors.general && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Field id="firstName" label={t('auth.firstName')} value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })} error={errors.firstName} />
            <Field id="lastName" label={t('auth.lastName')} value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })} error={errors.lastName} />
          </div>
          <Field id="username" label={t('auth.username')} value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })} error={errors.username} />
          <Field id="email" label={t('auth.email')} type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password" style={{ color: 'var(--text-primary)' }}>
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-400' : ''}`}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
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
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Min 8 characters, 1 uppercase, 1 number</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('auth.creatingAccount') : t('auth.signUp')}
          </button>
        </form>

        <p className="text-sm text-center mt-4" style={{ color: 'var(--text-secondary)' }}>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-blue-600 hover:underline">{t('auth.signIn')}</Link>
        </p>
      </div>
    </div>
  )
}
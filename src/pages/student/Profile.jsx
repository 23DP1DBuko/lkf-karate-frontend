/* Profile.jsx */
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/strapi'
import { useTheme } from '../../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import {
  EyeIcon,
  EyeSlashIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const { theme, setTheme } = useTheme()

  const { t, i18n } = useTranslation()

  const changeLanguage = lang => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
  }

  const handleProfileSubmit = async e => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)
    try {
      const putRes = await api.put(`/users/${user.id}`, {
        username: form.username,
      })
      console.log('PUT response:', putRes)
      const updated = await api.get('/users/me?populate=role')
      console.log('GET response:', updated)
      setUser(updated.data)
      setProfileSuccess('Profile updated successfully!')
    } catch (err) {
      console.error('Profile error:', err)
      setProfileError('Failed to update profile. Username may already be taken.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async e => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(passwordForm.newPassword)) {
      setPasswordError('Password must contain at least one uppercase letter')
      return
    }
    if (!/[0-9]/.test(passwordForm.newPassword)) {
      setPasswordError('Password must contain at least one number')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordLoading(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.newPassword,
        passwordConfirmation: passwordForm.confirmPassword,
      })
      setPasswordSuccess('Password changed successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPasswordError('Current password is incorrect.')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Segmented control helpers
  const themeOptions = [
    {
      value: 'light',
      label: t('profile.light') || 'Gaišs',
      icon: SunIcon,
    },
    {
      value: 'dark',
      label: t('profile.dark') || 'Tumšs',
      icon: MoonIcon,
    },
    {
      value: 'system',
      label: t('profile.system') || 'Sistēma',
      icon: ComputerDesktopIcon,
    },
  ]

  const languageOptions = [
    { code: 'lv', label: 'LV Latviešu' },
    { code: 'ru', label: 'RU Русский' },
    { code: 'en', label: 'GB English' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-blue-700">My Profile</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-gray-500 text-sm">@{user?.username}</p>
          </div>
        </div>

        {profileSuccess && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4 text-sm">
            {profileSuccess}
          </div>
        )}
        {profileError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {profileError}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 border-gray-200 text-gray-400 placeholder-gray-400 cursor-not-allowed"
              value={form.email}
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <button
            type="submit"
            disabled={profileLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {profileLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>

        {passwordSuccess && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4 text-sm">
            {passwordSuccess}
          </div>
        )}
        {passwordError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="currentPassword">
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={passwordForm.currentPassword}
                onChange={e =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="newPassword">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={passwordForm.newPassword}
                onChange={e =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Min 8 characters, 1 uppercase, 1 number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={passwordForm.confirmPassword}
                onChange={e =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Appearance: theme + language */}
<div
  className="rounded-xl shadow p-6 space-y-6"
  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
>
  <h2
    className="text-lg font-semibold"
    style={{ color: 'var(--text-primary)' }}
  >
    {t('profile.appearance')}
  </h2>

  {/* Theme segmented control */}
  <div className="space-y-2">
    <div>
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
        {t('profile.theme')}
      </p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('profile.themeDesc') || 'Izvēlies vēlamo izskatu'}
      </p>
    </div>

    <div className="relative inline-flex rounded-full px-1 py-1 bg-slate-100/80 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-700/80">
      {/* Sliding pill */}
      <div
        className="absolute inset-y-[4px] rounded-full bg-blue-600 shadow-sm transition-all duration-200"
        style={{
          width: '32%',
          left: '2%',
          transform:
            theme === 'light'
              ? 'translateX(0%)'
              : theme === 'dark'
              ? 'translateX(100%)'
              : 'translateX(200%)',
        }}
      />
      {themeOptions.map(opt => {
        const Icon = opt.icon
        const isActive = theme === opt.value
        return (
          <label
            key={opt.value}
            className="relative z-10 flex-1 cursor-pointer select-none"
          >
            <input
              type="radio"
              name="theme"
              value={opt.value}
              className="sr-only"
              checked={isActive}
              onChange={() => setTheme(opt.value)}
            />
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors">
              <Icon
                className={`h-4 w-4 ${
                  isActive ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              />
              <span
                className={
                  isActive
                    ? 'text-white'
                    : 'text-slate-700 dark:text-slate-200'
                }
              >
                {opt.label}
              </span>
            </div>
          </label>
        )
      })}
    </div>
  </div>

  {/* Language segmented control – same structure as theme */}
  <div className="space-y-2">
    <div>
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
        {t('profile.languageLabel') || 'Valoda'}
      </p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('profile.languageDesc') || 'Choose your interface language'}
      </p>
    </div>

    <div className="relative inline-flex rounded-full px-1 py-1 bg-slate-100/80 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-700/80">
      <div
        className="absolute inset-y-[4px] rounded-full bg-blue-600 shadow-sm transition-all duration-200"
        style={{
          width: '32%',
          left: '2%',
          transform:
            i18n.language === 'lv'
              ? 'translateX(0%)'
              : i18n.language === 'ru'
              ? 'translateX(100%)'
              : 'translateX(200%)',
        }}
      />
      {languageOptions.map(opt => {
        const isActive = i18n.language === opt.code
        const [code, ...rest] = opt.label.split(' ')
        const label = rest.join(' ')
        return (
          <label
            key={opt.code}
            className="relative z-10 flex-1 cursor-pointer select-none"
          >
            <input
              type="radio"
              name="language"
              value={opt.code}
              className="sr-only"
              checked={isActive}
              onChange={() => changeLanguage(opt.code)}
            />
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors">
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded ${
                  isActive
                    ? 'bg-blue-500/40 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                {code}
              </span>
              <span
                className={
                  isActive
                    ? 'text-white'
                    : 'text-slate-700 dark:text-slate-200'
                }
              >
                {label}
              </span>
            </div>
          </label>
        )
      })}
    </div>
  </div>
</div>
    </div>
  )
}
import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
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

async function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const size = 320
  canvas.width = size
  canvas.height = size

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  )

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png')
  })
}

export default function Profile() {
  const { user, setUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()

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

  const [selectedImage, setSelectedImage] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:1337'
  const avatarUrl = user?.profilePicture?.url
    ? `${apiBase}${user.profilePicture.url}`
    : null

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleSelectAvatar = e => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result)
      setAvatarModalOpen(true)
      setAvatarError('')
    }
    reader.readAsDataURL(file)
  }

  const handleUploadCroppedAvatar = async () => {
    if (!selectedImage || !croppedAreaPixels) return

    setAvatarLoading(true)
    setAvatarError('')
    setProfileSuccess('')
    setProfileError('')

    try {
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels)

      const formData = new FormData()
      formData.append('files', croppedBlob, 'avatar.png')

      const uploadRes = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const uploadedFile = uploadRes.data?.[0]
      if (!uploadedFile) throw new Error('Upload failed')

      await api.put(`/users/${user.id}`, {
        profilePicture: uploadedFile.id,
      })

      const updated = await api.get('/users/me?populate[0]=role&populate[1]=profilePicture')
      setUser(updated.data)

      setAvatarModalOpen(false)
      setSelectedImage(null)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
      setProfileSuccess('Profile picture updated successfully!')
    } catch (err) {
      console.error('Avatar upload error:', err)
      setAvatarError('Failed to upload profile picture')
    } finally {
      setAvatarLoading(false)
    }
  }

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
      await api.put(`/users/${user.id}`, {
        username: form.username,
      })

      const updated = await api.get('/users/me?populate=*')
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

  const themeOptions = [
    { value: 'light', label: t('profile.light') || 'Gaišs', icon: SunIcon },
    { value: 'dark', label: t('profile.dark') || 'Tumšs', icon: MoonIcon },
    { value: 'system', label: t('profile.system') || 'Sistēma', icon: ComputerDesktopIcon },
  ]

  const languageOptions = [
    { code: 'lv', label: 'LV Latviešu' },
    { code: 'ru', label: 'RU Русский' },
    { code: 'en', label: 'GB English' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-blue-700">My Profile</h1>

      <div
        className="rounded-xl shadow p-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border"
                style={{ borderColor: 'var(--border)' }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
            )}

            <label className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-blue-700">
              Edit
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleSelectAvatar}
              />
            </label>
          </div>

          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              @{user?.username}
            </p>
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

      <div
        className="rounded-xl shadow p-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Change Password
        </h2>

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

      <div
        className="rounded-xl shadow p-6 space-y-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('profile.appearance')}
        </h2>

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
                        isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'
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
                        isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'
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

      {avatarModalOpen && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Crop profile picture
            </h3>

            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                Zoom
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {avatarError && (
              <div className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded text-sm">
                {avatarError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAvatarModalOpen(false)
                  setSelectedImage(null)
                }}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadCroppedAvatar}
                disabled={avatarLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {avatarLoading ? 'Saving...' : 'Save avatar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
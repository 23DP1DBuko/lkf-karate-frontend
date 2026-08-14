import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useFocusTrap from '../../hooks/useFocusTrap'
import Cropper from 'react-easy-crop'
import { useAuth } from '../../context/useAuth'
import api from '../../api/strapi'

import { useTranslation } from 'react-i18next'
import {
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import SettingsAppearance from '../../components/SettingsAppearance'
import RankSelect from '../../components/RankSelect'
import { KUMITE_RANKS, KATA_RANKS } from '../../utils/refereeRanks'

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
  const { user, setUser, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    birthday: user?.birthday || '',
    rankKumite: user?.rankKumite || '',
    rankKata: user?.rankKata || '',
    country: user?.country || '',
    clubName: user?.clubName || '',
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const deleteModalRef = useRef(null)
  const avatarModalRef = useRef(null)
  useFocusTrap(deleteModalRef)
  useFocusTrap(avatarModalRef)

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
      setAvatarError(t('profile.avatarFailed') || 'Failed to upload profile picture')
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
      setProfileSuccess(t('profile.avatarUpdated') || 'Profile picture updated successfully!')
    } catch (err) {
      console.error('Avatar upload error:', err)
      setAvatarError(t('profile.avatarFailed') || 'Failed to upload profile picture')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleProfileSubmit = async e => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)

    try {
      await api.put(`/users/${user.id}`, {
        username: form.username,
        birthday: form.birthday || null,
        rankKumite: form.rankKumite,
        rankKata: form.rankKata,
        country: form.country || null,
        clubName: form.clubName || null,
      })

      const updated = await api.get('/users/me?populate=*')
      setUser(updated.data)
      setProfileSuccess(t('profile.updateSuccess') || 'Profile updated successfully!')
    } catch (err) {
      console.error('Profile error:', err)
      setProfileError(t('profile.updateFailed') || 'Failed to update profile. Username may already be taken.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async e => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('profile.passwordMinLength') || 'Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(passwordForm.newPassword)) {
      setPasswordError(t('profile.passwordUppercase') || 'Password must contain at least one uppercase letter')
      return
    }
    if (!/[0-9]/.test(passwordForm.newPassword)) {
      setPasswordError(t('profile.passwordNumber') || 'Password must contain at least one number')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('profile.passwordMatch') || 'Passwords do not match')
      return
    }

    setPasswordLoading(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.newPassword,
        passwordConfirmation: passwordForm.confirmPassword,
      })
      setPasswordSuccess(t('profile.passwordChanged') || 'Password changed successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      setPasswordError(t('profile.passwordIncorrect') || 'Current password is incorrect.')
    } finally {
      setPasswordLoading(false)
    }
  }


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('profile.title') || 'My Profile'}</h1>

      <div
        className="rounded-xl shadow p-5 sm:p-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Profile picture'}
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
              {t('profile.editAvatar') || 'Edit'}
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
              {t('auth.username') || 'Username'}
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
            <label className="block text-sm font-medium mb-1">{t('auth.email') || 'Email'}</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 border-gray-200 text-gray-400 placeholder-gray-400 cursor-not-allowed"
              value={form.email}
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">{t('profile.emailCannotChange') || 'Email cannot be changed'}</p>
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="birthday">
              {t('profile.birthday') || 'Birthday'}
            </label>
            <input
              id="birthday"
              type="date"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.birthday}
              onChange={e => setForm({ ...form, birthday: e.target.value })}
            />
          </div>

          {/* Referee / judge ranks — one per discipline */}
          <RankSelect
            id="rankKumite"
            label={t('ranks.kumiteRank') || 'Kumite rank'}
            ladder={KUMITE_RANKS}
            value={form.rankKumite}
            onChange={v => setForm({ ...form, rankKumite: v })}
          />
          <RankSelect
            id="rankKata"
            label={t('ranks.kataRank') || 'Kata rank'}
            ladder={KATA_RANKS}
            value={form.rankKata}
            onChange={v => setForm({ ...form, rankKata: v })}
          />

          {/* Country */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="country">
              {t('profile.country') || 'Country'}
            </label>
            <select
              id="country"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
            >
              <option value="">{t('profile.selectCountry') || 'Select country...'}</option>
              <option value="Latvia">Latvia</option>
            </select>
          </div>

          {/* Club */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="clubName">
              {t('profile.clubName') || 'Club'}
            </label>
            <select
              id="clubName"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.clubName}
              onChange={e => setForm({ ...form, clubName: e.target.value })}
            >
              <option value="">{t('profile.selectClub') || 'Select club...'}</option>
              <option value="Leonīda Vasiļjeva Karatē skola">Leonīda Vasiļjeva Karatē skola</option>
              <option value="Latvijas Godžju-rju Karatē Federācija">Latvijas Godžju-rju Karatē Federācija</option>
              <option value="Fudzi Sporta Klubs">Fudzi Sporta Klubs</option>
              <option value="Salaspils Karatē Klubs">Salaspils Karatē Klubs</option>
              <option value="Tan">Tan</option>
              <option value="Rīgas Karatē Klubs">Rīgas Karatē Klubs</option>
              <option value="Ippon.lv">Ippon.lv</option>
              <option value="Bolderājas Karatē klubs">Bolderājas Karatē klubs</option>
              <option value="Daugavpils karatē skola">Daugavpils karatē skola</option>
              <option value="Sochin Karate Klub">Sochin Karate Klub</option>
              <option value="Ruslana Sadikova sporta skola">Ruslana Sadikova sporta skola</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {profileLoading ? (t('profile.saving') || 'Saving...') : (t('profile.saveChanges') || 'Save Changes')}
          </button>
        </form>
      </div>

      <div
        className="rounded-xl shadow p-5 sm:p-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {t('profile.changePassword') || 'Change Password'}
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
              {t('profile.currentPassword') || 'Current Password'}
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
              {t('profile.newPassword') || 'New Password'}
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
              {t('profile.passwordHint') || 'Min 8 characters, 1 uppercase, 1 number'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">
              {t('profile.confirmPassword') || 'Confirm New Password'}
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
            {passwordLoading ? (t('profile.changing') || 'Changing...') : (t('profile.changePasswordBtn') || 'Change Password')}
          </button>
        </form>
      </div>

      <div
        className="rounded-xl shadow p-5 sm:p-6 space-y-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('profile.appearance')}
        </h2>
        <SettingsAppearance />
      </div>

      {/* ── Danger Zone ── */}
      <div
        className="rounded-xl p-6 border-2 border-red-200"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-600">{t('profile.dangerZone') || 'Danger Zone'}</h2>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('profile.deleteWarning') || 'Once you delete your account, there is no going back. Please be certain.'}
        </p>

        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition"
        >
          <TrashIcon className="h-4 w-4" />
          {t('profile.deleteProfile') || 'Delete Profile'}
        </button>
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteModalOpen && (
        <div
          ref={deleteModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          onKeyDown={e => { if (e.key === 'Escape') { setDeleteModalOpen(false); setDeleteConfirmInput(''); setDeleteError('') } }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <h3 id="delete-account-title" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('profile.deleteAccount') || 'Delete Account'}
              </h3>
            </div>

            <div className="space-y-3 mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <p>{t('profile.deletePermanent') || 'This action is'} <strong className="text-red-600">{t('profile.permanent') || 'permanent'}</strong> {t('profile.cannotUndo') || 'and cannot be undone.'}</p>
              <p>{t('profile.deleteDataList') || 'The following data will be deleted:'}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('profile.deleteAccountInfo') || 'Your account and profile information'}</li>
                <li>{t('profile.deleteExamData') || 'All exam attempts and results'}</li>
                <li>{t('profile.deleteProgress') || 'Chapter progress and study history'}</li>
                <li>{t('profile.deleteUploads') || 'Profile picture and uploaded files'}</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" htmlFor="delete-confirm" style={{ color: 'var(--text-primary)' }}>
                {t('profile.deleteConfirmLabel') || 'Type your email'} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{user?.email}</span> {t('profile.toConfirm') || 'to confirm:'}
              </label>
              <input
                id="delete-confirm"
                type="text"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder={user?.email || 'Enter your email'}
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                autoFocus
              />
            </div>

            {deleteError && (
              <div className="mb-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false)
                  setDeleteConfirmInput('')
                  setDeleteError('')
                }}
                className="px-4 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeletingAccount(true)
                  setDeleteError('')
                  try {
                    await api.delete('/account/delete')
                    logout()
                    navigate('/login', { state: { message: 'Your account has been deleted.' } })
                  } catch (err) {
                    setDeleteError(err.response?.data?.error?.message || 'Failed to delete account. Please try again.')
                    setDeletingAccount(false)
                  }
                }}
                disabled={deleteConfirmInput !== user?.email || deletingAccount}
                className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAccount ? (t('profile.deleting') || 'Deleting...') : (t('profile.confirmDelete') || 'Confirm Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {avatarModalOpen && selectedImage && (
        <div
          ref={avatarModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-crop-title"
          onKeyDown={e => { if (e.key === 'Escape') { setAvatarModalOpen(false); setSelectedImage(null) } }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h3 id="avatar-crop-title" className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {t('profile.cropAvatar') || 'Crop profile picture'}
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
                {t('profile.zoom') || 'Zoom'}
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
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleUploadCroppedAvatar}
                disabled={avatarLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {avatarLoading ? (t('profile.saving') || 'Saving...') : (t('profile.saveAvatar') || 'Save avatar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
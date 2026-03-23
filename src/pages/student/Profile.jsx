import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/strapi'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    email: user?.email || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)
    try {
      const putRes = await api.put(`/users/${user.id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
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

  const handlePasswordSubmit = async (e) => {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-blue-700">My Profile</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h2>
            <p className="text-gray-500 text-sm">@{user?.username}</p>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              user?.verification === 'approved'
                ? 'bg-green-100 text-green-700'
                : user?.verification === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              {user?.verification || 'pending'}
            </span>
          </div>
        </div>

        {profileSuccess && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4 text-sm">{profileSuccess}</div>
        )}
        {profileError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">{profileError}</div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="username">Username</label>
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
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-400 cursor-not-allowed"
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
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4 text-sm">{passwordSuccess}</div>
        )}
        {passwordError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">{passwordError}</div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="currentPassword">Current Password</label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPassword ? 'text' : 'password'}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Min 8 characters, 1 uppercase, 1 number</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />
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
    </div>
  )
}
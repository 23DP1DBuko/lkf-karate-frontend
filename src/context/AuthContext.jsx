import { useState, useEffect } from 'react'
import i18n from '../i18n'
import api from '../api/strapi'
import { AuthContext } from './useAuth'

function applyTheme(themePreference) {
  if (themePreference === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (themePreference === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('token')
    return !!token
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let cancelled = false
    api.get('/users/me?populate[0]=role&populate[1]=profilePicture')
      .then(res => {
        if (!cancelled) {
          setUser(res.data)
          // Restore language preference from backend
          if (res.data.language) {
            i18n.changeLanguage(res.data.language)
            localStorage.setItem('language', res.data.language)
          }
          // Restore theme preference from backend
          if (res.data.themePreference) {
            localStorage.setItem('theme', res.data.themePreference)
            applyTheme(res.data.themePreference)
          }
        }
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const login = async (identifier, password) => {
    const res = await api.post('/auth/local', { identifier, password })
    localStorage.setItem('token', res.data.jwt)
    const userRes = await api.get('/users/me?populate[0]=role&populate[1]=profilePicture')
    setUser(userRes.data)

    // Restore language preference from backend
    if (userRes.data.language) {
      i18n.changeLanguage(userRes.data.language)
      localStorage.setItem('language', userRes.data.language)
    }
    // Restore theme preference from backend
    if (userRes.data.themePreference) {
      localStorage.setItem('theme', userRes.data.themePreference)
      applyTheme(userRes.data.themePreference)
    }

    return userRes.data
  }

  const register = async (username, email, password, firstName, lastName) => {
    const res = await api.post('/auth/local/register', {
      username,
      email,
      password,
    })
    localStorage.setItem('token', res.data.jwt)

    const detectedLanguage = i18n.language?.split('-')[0] || 'lv'
    const supportedLanguages = ['lv', 'ru', 'en']
    const language = supportedLanguages.includes(detectedLanguage) ? detectedLanguage : 'lv'

    await api.put(`/users/${res.data.user.id}`, {
      firstName,
      lastName,
      verification: 'pending',
      language,
    })

    i18n.changeLanguage(language)
    localStorage.setItem('language', language)

    const updatedUser = {
      ...res.data.user,
      firstName,
      lastName,
      verification: 'pending',
      language,
    }
    setUser(updatedUser)
    return updatedUser
  }

  const updatePreferences = async (preferences) => {
    if (!user?.id) return

    try {
      const { data } = await api.put(`/users/${user.id}`, preferences)
      // Update local user state so it stays in sync
      setUser(prev => ({ ...prev, ...preferences }))
      return data
    } catch (err) {
      console.error('Failed to save preferences:', err)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  )
}
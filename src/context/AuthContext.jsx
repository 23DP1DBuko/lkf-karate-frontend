import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/strapi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    api.get('/users/me?populate=role')
      .then(res => { if (!cancelled) setUser(res.data) })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const login = async (identifier, password) => {
    const res = await api.post('/auth/local', { identifier, password })
    localStorage.setItem('token', res.data.jwt)
    const userRes = await api.get('/users/me?populate=role')
    setUser(userRes.data)
    return userRes.data
  }

  const register = async (username, email, password, firstName, lastName) => {
    const res = await api.post('/auth/local/register', {
      username,
      email,
      password,
    })
    localStorage.setItem('token', res.data.jwt)

    await api.put(`/users/${res.data.user.id}`, {
      firstName,
      lastName,
      verification: 'pending',
    })

    const updatedUser = {
      ...res.data.user,
      firstName,
      lastName,
      verification: 'pending',
    }
    setUser(updatedUser)
    return updatedUser
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

console.log('API_URL:', API_URL)
console.log('ENV:', import.meta.env)

const api = axios.create({
  baseURL: `${API_URL}/api`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
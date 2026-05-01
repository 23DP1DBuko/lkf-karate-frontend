import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

console.log('API_URL:', API_URL)

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

export function getQuestionText(question, language) {
  return getLocalizedField(question, language, 'text')
}

export function getLocalizedField(item, language, fieldBase) {
  if (!item) return ''
  const langMap = { lv: 'Lv', ru: 'Ru', en: 'En' }
  const suffix = langMap[language] || 'Lv'
  const localizedKey = `${fieldBase}${suffix}`
  if (item[localizedKey]) return item[localizedKey]
  // Fallback chain: lv → en → base field
  return item[`${fieldBase}Lv`] || item[`${fieldBase}En`] || item[fieldBase] || ''
}
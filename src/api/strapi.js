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
  if (!question) return ''
  if (language === 'lv' && question.textLv) return question.textLv
  if (language === 'ru' && question.textRu) return question.textRu
  if (language === 'en' && question.textEn) return question.textEn
  // fallback chain
  return question.textLv || question.textEn || question.textRu || question.text || ''
}
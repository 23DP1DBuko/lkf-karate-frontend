const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

export function mediaUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_URL}${path}`
}
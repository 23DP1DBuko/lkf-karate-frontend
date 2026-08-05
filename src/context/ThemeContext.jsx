import { useEffect, useState } from 'react'
import { ThemeContext } from './useTheme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        isDark ? root.classList.add('dark') : root.classList.remove('dark')
    } else if (theme === 'dark') {
        root.classList.add('dark')
    } else {
        root.classList.remove('dark')
    }

    localStorage.setItem('theme', theme)
    }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
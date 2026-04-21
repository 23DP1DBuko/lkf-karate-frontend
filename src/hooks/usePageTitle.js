import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — LKF Karate LMS` : 'LKF Karate LMS'
    return () => {
      document.title = 'LKF Karate LMS'
    }
  }, [title])
}
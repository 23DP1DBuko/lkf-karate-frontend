import { useState } from 'react'
import { ExamAttemptContext } from './useExamAttempt'

export function ExamAttemptProvider({ children }) {
  const [activeAttempt, setActiveAttempt] = useState(null)

  const clearActiveAttempt = () => setActiveAttempt(null)

  return (
    <ExamAttemptContext.Provider value={{ activeAttempt, setActiveAttempt, clearActiveAttempt }}>
      {children}
    </ExamAttemptContext.Provider>
  )
}
import { createContext, useContext, useState } from 'react'

const ExamAttemptContext = createContext(null)

export function ExamAttemptProvider({ children }) {
  const [activeAttempt, setActiveAttempt] = useState(null)

  const clearActiveAttempt = () => setActiveAttempt(null)

  return (
    <ExamAttemptContext.Provider value={{ activeAttempt, setActiveAttempt, clearActiveAttempt }}>
      {children}
    </ExamAttemptContext.Provider>
  )
}

export function useExamAttempt() {
  const ctx = useContext(ExamAttemptContext)
  if (!ctx) throw new Error('useExamAttempt must be used inside ExamAttemptProvider')
  return ctx
}
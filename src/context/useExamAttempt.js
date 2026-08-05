import { createContext, useContext } from 'react'

export const ExamAttemptContext = createContext(null)

export function useExamAttempt() {
  const ctx = useContext(ExamAttemptContext)
  if (!ctx) throw new Error('useExamAttempt must be used inside ExamAttemptProvider')
  return ctx
}

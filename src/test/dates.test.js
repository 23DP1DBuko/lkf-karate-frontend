import { describe, it, expect } from 'vitest'
import { formatDateTime } from '../utils/dates'

describe('formatDateTime', () => {
  it('renders date and time without seconds', () => {
    const out = formatDateTime('2026-10-15T14:00:45')
    expect(out).not.toContain(':45')
    expect(out).toMatch(/14:00/)
    expect(out).toMatch(/2026/)
  })

  it('returns an empty string for missing or invalid values', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('not-a-date')).toBe('')
  })
})

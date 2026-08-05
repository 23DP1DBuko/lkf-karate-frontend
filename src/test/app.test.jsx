import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    user: null,
    loading: false,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      state: {
        score: 80,
        passed: true,
        correct: 8,
        total: 10,
        showResults: true,
        resultsReleased: true,
      },
    }),
  }
})

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key) => key,
      i18n: { changeLanguage: () => Promise.resolve() },
    }),
  }
})

import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ExamResult from '../pages/student/ExamResult'

// ─── Login Page ──────────────────────────────────────────────────────────────
describe('Login Page', () => {
  it('renders email and password fields', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByLabelText(/auth\.email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^auth\.password$/i)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /auth\.signIn/i })).toBeInTheDocument()
  })

  it('has a link to register page', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /auth\.signUp/i })).toBeInTheDocument()
  })
})

// ─── Register Page ───────────────────────────────────────────────────────────
describe('Register Page', () => {
  it('renders username email and password fields', () => {
    render(<MemoryRouter><Register /></MemoryRouter>)
    expect(screen.getByLabelText(/auth\.username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/auth\.email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^auth\.password$/i)).toBeInTheDocument()
  })

  it('renders create account button', () => {
    render(<MemoryRouter><Register /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /auth\.signUp/i })).toBeInTheDocument()
  })
})

// ─── Exam Result Page ────────────────────────────────────────────────────────
describe('Exam Result Page', () => {
  it('displays score and passed status', () => {
    render(<MemoryRouter><ExamResult /></MemoryRouter>)
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
  })

  it('shows correct out of total', () => {
    render(<MemoryRouter><ExamResult /></MemoryRouter>)
    expect(screen.getByText(/8 examResult\.outOf 10/)).toBeInTheDocument()
  })
})
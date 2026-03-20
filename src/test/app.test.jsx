import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock AuthContext once at top level
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    user: null,
    loading: false,
  }),
}))

// Mock react-router-dom navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      state: { score: 80, passed: true, correct: 8, total: 10 }
    }),
  }
})

import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ExamResult from '../pages/student/ExamResult'

// ─── Test 1: Login renders correctly ────────────────────────────────────────
describe('Login Page', () => {
  it('renders email and password fields', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('has a link to register page', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })
})

// ─── Test 2: Register renders correctly ──────────────────────────────────────
describe('Register Page', () => {
  it('renders username email and password fields', () => {
    render(<MemoryRouter><Register /></MemoryRouter>)
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders create account button', () => {
    render(<MemoryRouter><Register /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })
})

// ─── Test 3: Exam result shows score ─────────────────────────────────────────
describe('Exam Result Page', () => {
  it('displays score and passed status', () => {
    render(<MemoryRouter><ExamResult /></MemoryRouter>)
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
  })

  it('shows correct out of total', () => {
    render(<MemoryRouter><ExamResult /></MemoryRouter>)
    expect(screen.getByText(/8 out of 10/i)).toBeInTheDocument()
  })
})
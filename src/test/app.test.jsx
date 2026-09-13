import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

vi.mock('../context/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
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

  it('requires agreement to Terms and Privacy before registering', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><Register /></MemoryRouter>)

    // Consent checkbox links to the legal pages.
    expect(screen.getByRole('link', { name: /auth\.consentTerms/i })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: /auth\.consentPrivacy/i })).toHaveAttribute('href', '/privacy')

    // Fill every required field but leave the consent box unchecked.
    await user.type(screen.getByLabelText(/auth\.firstName/i), 'Jānis')
    await user.type(screen.getByLabelText(/auth\.lastName/i), 'Bērziņš')
    await user.type(screen.getByLabelText(/auth\.username/i), 'janis')
    await user.type(screen.getByLabelText(/auth\.email/i), 'janis@example.com')
    await user.type(screen.getByLabelText(/^auth\.password$/i), 'Password1')

    await user.click(screen.getByRole('button', { name: /auth\.signUp/i }))
    expect(await screen.findByText('auth.consentRequired')).toBeInTheDocument()

    // Checking the box clears the gate and lets registration proceed.
    await user.click(screen.getByLabelText(/auth\.consentPrefix/i))
    await user.click(screen.getByRole('button', { name: /auth\.signUp/i }))
    await waitFor(() => {
      expect(screen.queryByText('auth.consentRequired')).not.toBeInTheDocument()
    })
  })
})

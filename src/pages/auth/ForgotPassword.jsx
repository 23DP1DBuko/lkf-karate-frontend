import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/strapi'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError('Failed to send reset email. Please check your email address.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-2">Check your email</h1>
          <p className="text-gray-500 mb-6">
            We sent a password reset link to <strong>{email}</strong>
          </p>
          <Link to="/login" className="text-blue-600 hover:underline text-sm">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">LKF Karate LMS</h1>
        <h2 className="text-xl font-semibold mb-2">Forgot Password</h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your email and we'll send you a reset link.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-sm text-center mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
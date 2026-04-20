import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function Landing() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/dashboard" />

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥋</span>
            <span className="font-bold text-blue-700 text-lg">LKF Karate LMS</span>
          </div>
          <div className="flex gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:underline"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">🥋</div>
        <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-4">
          LKF Karate LMS
        </h1>
        <p className="text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
          Latvijas Karatē federācijas tiesnešu un sacensību sekretāru kvalifikācijas platforma
        </p>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          Study courses, take qualification exams, and track your progress
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 text-lg"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 text-lg"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: 'var(--text-primary)' }}>
          Everything you need for karate qualification
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '📚', title: 'Structured Courses', desc: 'Kata, Kumite and Secretary courses with chapters, videos and images' },
            { icon: '📝', title: 'Qualification Exams', desc: 'Official exams with multiple choice and open text questions' },
            { icon: '🎯', title: 'Practice Quizzes', desc: 'Test your knowledge anytime with random quizzes' },
            { icon: '📊', title: 'Track Progress', desc: 'See your results, completed chapters and exam history' },
            { icon: '👥', title: 'Judge Management', desc: 'Admin approval system for verified judges only' },
            { icon: '🏆', title: 'Instant Feedback', desc: 'Know immediately if your answers are correct' },
          ].map((feature, i) => (
            <div
              key={i}
              className="rounded-xl p-6 text-center shadow"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div
          className="rounded-2xl p-10"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <h2 className="text-2xl font-bold text-blue-700 mb-3">
            Ready to become a certified karate judge?
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Register your account and wait for admin approval to get started.
          </p>
          <Link
            to="/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 inline-block"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-12 py-6" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            © 2026 LKF Karate LMS · Latvijas Karatē federācija
          </p>
        </div>
      </footer>
    </div>
  )
}
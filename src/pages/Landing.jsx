import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTranslation } from 'react-i18next'

export default function Landing() {
  const { user, loading } = useAuth()
  usePageTitle('Welcome')
  const { t } = useTranslation()

  if (loading) return null
  if (user) return <Navigate to="/dashboard" />

return (
  <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-700 text-lg">LKF Academy</span>
          </div>
          <div className="flex gap-3 items-center">
            <Link to="/rules" className="px-4 py-2 text-sm font-medium hover:underline"
              style={{ color: 'var(--text-secondary)' }}>
              Rules
            </Link>
            {user ? (
              <Link to="/dashboard"
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {user.firstName || user.username} →
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-blue-600 hover:underline">
                  Sign In
                </Link>
                <Link to="/register"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-6">🥋</div>
          <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-4">
            LKF Academy
          </h1>
          <p className="text-xl mb-2 text-white">
            {t('landing.subtitle')}
          </p>
          <p className="mb-8 text-blue-100">
            {t('landing.description')}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/register"
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 text-lg"
            >
              {t('landing.getStarted')}
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-blue-700 text-lg transition"
            >
              {t('landing.signIn')}
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-10" style={{ color: 'var(--text-primary)' }}>
            {t('landing.featuresTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '📚', title: t('landing.features.courses'), desc: t('landing.features.coursesDesc') },
              { icon: '📝', title: t('landing.features.exams'), desc: t('landing.features.examsDesc') },
              { icon: '🎯', title: t('landing.features.quiz'), desc: t('landing.features.quizDesc') },
              { icon: '📊', title: t('landing.features.progress'), desc: t('landing.features.progressDesc') },
              { icon: '👥', title: t('landing.features.management'), desc: t('landing.features.managementDesc') },
              { icon: '🏆', title: t('landing.features.feedback'), desc: t('landing.features.feedbackDesc') },
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
              {t('landing.ctaTitle')}
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t('landing.ctaDesc')}
            </p>
            <Link
              to="/register"
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 inline-block"
            >
              {t('landing.createAccount')}
            </Link>
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="border-t mt-12 py-6" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('landing.footer')}
          </p>
        </div>
      </footer>
    </div>
  )
}
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMenuOpen(false)
  }

  return (
    <nav style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }} className="border-b">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-700 font-bold text-lg">
            🥋 LKF Karate
          </Link>

          {user && (
            <>
              <div className="hidden md:flex items-center gap-4">
                <Link to="/courses" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('nav.courses')}
                </Link>
                <Link to="/results" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('nav.results')}
                </Link>
                {user.isAdmin && (
                  <>
                    <Link to="/admin/courses" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>📚 {t('nav.admin.courses')}</Link>
                    <Link to="/admin/chapters" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>📄 {t('nav.admin.chapters')}</Link>
                    <Link to="/admin/questions" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>❓ {t('nav.admin.questions')}</Link>
                    <Link to="/admin/exams" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>📝 {t('nav.admin.exams')}</Link>
                    <Link to="/admin/results" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>📊 {t('nav.admin.results')}</Link>
                    <Link to="/admin/users" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>👥 {t('nav.admin.users')}</Link>
                  </>
                )}
                <Link to="/profile" className="hover:text-blue-600 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  👤 {user?.firstName || user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-600"
                >
                  {t('nav.logout')}
                </button>
              </div>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden flex flex-col gap-1.5 p-2"
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}
              >
                <span className={`block w-6 h-0.5 bg-gray-600 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-6 h-0.5 bg-gray-600 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-6 h-0.5 bg-gray-600 transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </button>
            </>
          )}
        </div>

        {user && menuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t pt-3 space-y-1" style={{ borderColor: 'var(--border)' }}>
            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>
              🏠 {t('nav.dashboard')}
            </Link>
            <Link to="/courses" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>
              📚 {t('nav.courses')}
            </Link>
            <Link to="/results" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>
              📊 {t('nav.results')}
            </Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>
              👤 {user?.firstName || user?.username}
            </Link>

            {user.isAdmin && (
              <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs px-2 mb-1" style={{ color: 'var(--text-muted)' }}>Admin</p>
                <Link to="/admin/courses" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>📚 {t('nav.admin.courses')}</Link>
                <Link to="/admin/chapters" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>📄 {t('nav.admin.chapters')}</Link>
                <Link to="/admin/questions" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>❓ {t('nav.admin.questions')}</Link>
                <Link to="/admin/exams" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>📝 {t('nav.admin.exams')}</Link>
                <Link to="/admin/results" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>📊 {t('nav.admin.results')}</Link>
                <Link to="/admin/users" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}>👥 {t('nav.admin.users')}</Link>
              </div>
            )}

            <div className="border-t pt-2" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-2 py-2 text-red-500 hover:text-red-600 text-sm font-medium"
              >
                🚪 {t('nav.logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
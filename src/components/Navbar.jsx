import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMenuOpen(false)
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="text-blue-700 font-bold text-lg">
            🥋 LKF Karate
          </Link>

          {user && (
            <>
              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-4">
                <Link to="/courses" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                  Courses
                </Link>
                <Link to="/results" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                  Results
                </Link>
                {user.isAdmin && (
                  <>
                    <Link to="/admin/courses" className="text-gray-600 hover:text-blue-600 text-sm font-medium">📚 Courses</Link>
                    <Link to="/admin/chapters" className="text-gray-600 hover:text-blue-600 text-sm font-medium">📄 Chapters</Link>
                    <Link to="/admin/questions" className="text-gray-600 hover:text-blue-600 text-sm font-medium">❓ Questions</Link>
                    <Link to="/admin/exams" className="text-gray-600 hover:text-blue-600 text-sm font-medium">📝 Exams</Link>
                    <Link to="/admin/results" className="text-gray-600 hover:text-blue-600 text-sm font-medium">📊 Results</Link>
                    <Link to="/admin/users" className="text-gray-600 hover:text-blue-600 text-sm font-medium">👥 Users</Link>
                  </>
                )}
                <Link to="/profile" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                  👤 {user?.firstName || user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-600"
                >
                  Logout
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden flex flex-col gap-1.5 p-2"
              >
                <span className={`block w-6 h-0.5 bg-gray-600 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-6 h-0.5 bg-gray-600 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-6 h-0.5 bg-gray-600 transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu */}
        {user && menuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t pt-3 space-y-2">
            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm font-medium">
              🏠 Dashboard
            </Link>
            <Link to="/courses" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm font-medium">
              📚 Courses
            </Link>
            <Link to="/results" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm font-medium">
              📊 My Results
            </Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm font-medium">
              👤 {user?.firstName || user?.username}
            </Link>

            {user.isAdmin && (
              <>
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-gray-400 px-2 mb-1">Admin</p>
                  <Link to="/admin/courses" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm">📚 Manage Courses</Link>
                  <Link to="/admin/chapters" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm">📄 Manage Chapters</Link>
                  <Link to="/admin/questions" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm">❓ Manage Questions</Link>
                  <Link to="/admin/exams" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm">📝 Manage Exams</Link>
                  <Link to="/admin/results" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm">📊 Exam Results</Link>
                  <Link to="/admin/users" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-gray-600 hover:text-blue-600 text-sm">👥 Manage Users</Link>
                </div>
              </>
            )}

            <div className="border-t pt-2">
              <button
                onClick={handleLogout}
                className="w-full text-left px-2 py-2 text-red-500 hover:text-red-600 text-sm font-medium"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
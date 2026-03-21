import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="text-blue-700 font-bold text-lg">
          🥋 LKF Karate LMS
        </Link>

        {user && (
          <div className="flex items-center gap-6">
            <Link to="/courses" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              Courses
            </Link>
            <Link to="/results" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              My Results
            </Link>
            {user.isAdmin && (
            <div className="flex gap-4">
                <Link to="/admin/courses" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                📚 Courses
                </Link>
                <Link to="/admin/chapters" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                📄 Chapters
                </Link>
                <Link to="/admin/questions" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                ❓ Questions
                </Link>
                <Link to="/admin/exams" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                📝 Exams
                </Link>
                <Link to="/admin/users" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                  👥 Users
                </Link>
            </div>
            )}
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm text-gray-500">
                {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
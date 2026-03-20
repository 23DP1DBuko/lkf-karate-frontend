import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Courses from './pages/student/Courses'
import CourseDetail from './pages/student/CourseDetail'
import ChapterDetail from './pages/student/ChapterDetail'
import ExamPage from './pages/student/ExamPage'
import ExamResult from './pages/student/ExamResult'
import Layout from './components/Layout'
import Results from './pages/student/Results'
import AdminCourses from './pages/admin/AdminCourses'
import AdminChapters from './pages/admin/AdminChapters'
import AdminQuestions from './pages/admin/AdminQuestions'
import AdminExams from './pages/admin/AdminExams'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading...</p>
    </div>
  )
  if (!user) return <Navigate to="/login" />
  return <Layout>{children}</Layout>
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading...</p>
    </div>
  )
  if (!user) return <Navigate to="/login" />
  if (!user.isAdmin) return <Navigate to="/dashboard" />
  return <Layout>{children}</Layout>
}

function Dashboard() {
  const { user } = useAuth()
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h1 className="text-2xl font-bold text-blue-700 mb-2">
        Welcome, {user?.username}! 👋
      </h1>
      <p className="text-gray-500 mb-6">
        You are logged in as <span className="font-medium">{user?.email}</span>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <a href="/courses" className="bg-blue-50 border border-blue-200 rounded-xl p-5 hover:bg-blue-100 transition">
          <div className="text-3xl mb-2">📚</div>
          <h3 className="font-semibold text-blue-700">Courses</h3>
          <p className="text-sm text-gray-500">Browse and study courses</p>
        </a>
        <a href="/results" className="bg-green-50 border border-green-200 rounded-xl p-5 hover:bg-green-100 transition">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="font-semibold text-green-700">My Results</h3>
          <p className="text-sm text-gray-500">View your exam history</p>
        </a>
        <a href="/profile" className="bg-purple-50 border border-purple-200 rounded-xl p-5 hover:bg-purple-100 transition">
          <div className="text-3xl mb-2">👤</div>
          <h3 className="font-semibold text-purple-700">Profile</h3>
          <p className="text-sm text-gray-500">Manage your account</p>
        </a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/courses" element={
        <ProtectedRoute><Courses /></ProtectedRoute>
      } />
      <Route path="/courses/:documentId" element={
        <ProtectedRoute><CourseDetail /></ProtectedRoute>
      } />
      <Route path="/courses/:documentId/chapters/:chapterDocumentId" element={
        <ProtectedRoute><ChapterDetail /></ProtectedRoute>
      } />
      <Route path="/exam/:documentId" element={
        <ProtectedRoute><ExamPage /></ProtectedRoute>
      } />
      <Route path="/exam-result" element={
        <ProtectedRoute><ExamResult /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" />} />
      <Route path="/results" element={
        <ProtectedRoute><Results /></ProtectedRoute>
      } />
      <Route path="/admin/courses" element={
        <AdminRoute><AdminCourses /></AdminRoute>
      } />
      <Route path="/admin/chapters" element={
        <AdminRoute><AdminChapters /></AdminRoute>
      } />
      <Route path="/admin/questions" element={
        <AdminRoute><AdminQuestions /></AdminRoute>
      } />
      <Route path="/admin/exams" element={
        <AdminRoute><AdminExams /></AdminRoute>
      } />
    </Routes>
  )
}
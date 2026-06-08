import { Routes, Route, Navigate, Link } from 'react-router-dom'
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
import PendingApproval from './pages/auth/PendingApproval'
import AdminUsers from './pages/admin/AdminUsers'
import QuickQuiz from './pages/student/QuickQuiz'
import AdminExamResults from './pages/admin/AdminExamResults'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Profile from './pages/student/Profile'
import Landing from './pages/Landing'
import AdminImport from './pages/admin/AdminImport'
import { useTranslation } from 'react-i18next'
import Rules from './pages/landing/Rules'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading...</p>
    </div>
  )
  if (!user) return <Navigate to="/login" />
  if (user.verification === 'pending' || user.verification === 'rejected') {
    return <PendingApproval />
  }
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
  const { t } = useTranslation()
  return (
    <div className="rounded-xl shadow p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
      <h1 className="text-2xl font-bold text-blue-700 mb-2">
        {t('dashboard.welcome')}, {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}! 👋
      </h1>
      <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
        {t('dashboard.loggedInAs')} <span className="font-medium">{user?.email}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        <Link
          to="/courses"
          className="group rounded-xl border border-blue-200 bg-blue-50 p-5 text-slate-900 transition hover:bg-blue-100 hover:border-blue-300 dark:border-blue-800 dark:bg-blue-900/20 dark:text-slate-100 dark:hover:bg-blue-900/30"
        >
          <div className="mb-2 text-3xl transition-transform duration-200 group-hover:scale-105">
            📚
          </div>
          <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
            {t('dashboard.courses')}
          </h3>
          <p className="text-sm text-slate-700 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
            {t('dashboard.browseStudy')}
          </p>
        </Link>
        <Link
          to="/results"
          className="group rounded-xl border border-green-200 bg-green-50 p-5 text-slate-900 transition hover:bg-green-100 hover:border-green-300 dark:border-green-800 dark:bg-green-900/20 dark:text-slate-100 dark:hover:bg-green-900/30"
        >
          <div className="text-3xl mb-2 transition-transform duration-200 group-hover:scale-105">📊</div>
          <h3 className="font-semibold text-green-700 transition-colors group-hover:text-green-900 dark:group-hover:text-green-200">
            {t('dashboard.myResults')}
          </h3>
          <p className="text-sm text-slate-600 transition-colors group-hover:text-slate-800 dark:text-slate-300 dark:group-hover:text-white">
            {t('dashboard.viewHistory')}
          </p>
        </Link>
        <Link
          to="/profile"
          className="group rounded-xl border border-purple-200 bg-purple-50 p-5 text-slate-900 transition hover:bg-purple-100 hover:border-purple-300 dark:border-purple-800 dark:bg-purple-900/20 dark:text-slate-100 dark:hover:bg-purple-900/30"
        >
          <div className="text-3xl mb-2 transition-transform duration-200 group-hover:scale-105">👤</div>
          <h3 className="font-semibold text-purple-700 transition-colors group-hover:text-purple-900 dark:group-hover:text-purple-200">
            {t('dashboard.profile')}
          </h3>
          <p className="text-sm text-slate-600 transition-colors group-hover:text-slate-800 dark:text-slate-300 dark:group-hover:text-white">
            {t('dashboard.manageAccount')}
          </p>
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/rules" element={<Rules />} />
      <Route path="*" element={<Navigate to="/" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
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
      <Route path="/admin/users" element={
        <AdminRoute><AdminUsers /></AdminRoute>
      } />
      <Route path="/courses/:documentId/quiz" element={
        <ProtectedRoute><QuickQuiz /></ProtectedRoute>
      } />
      <Route path="/admin/results" element={
        <AdminRoute><AdminExamResults /></AdminRoute>
      } />
      <Route path="/admin/import" element={
        <AdminRoute><AdminImport /></AdminRoute>
      } />
    </Routes>
  )
}
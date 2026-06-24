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
import Rules from './pages/landing/Rules'
import UserDashboard from './pages/student/UserDashboard'

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
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
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
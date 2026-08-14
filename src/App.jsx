import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// ── Lazy-loaded pages (code-split by route) ────────────────────────────
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const PendingApproval = lazy(() => import('./pages/auth/PendingApproval'))
const Landing = lazy(() => import('./pages/Landing'))
const Rules = lazy(() => import('./pages/landing/Rules'))
const Privacy = lazy(() => import('./pages/landing/Privacy'))
const Terms = lazy(() => import('./pages/landing/Terms'))
const Gdpr = lazy(() => import('./pages/landing/Gdpr'))
const UserDashboard = lazy(() => import('./pages/student/UserDashboard'))
const Profile = lazy(() => import('./pages/student/Profile'))
const Courses = lazy(() => import('./pages/student/Courses'))
const Events = lazy(() => import('./pages/student/Events'))
const CourseDetail = lazy(() => import('./pages/student/CourseDetail'))
const ChapterDetail = lazy(() => import('./pages/student/ChapterDetail'))
const ExamPage = lazy(() => import('./pages/student/ExamPage'))
const Results = lazy(() => import('./pages/student/Results'))
const QuickQuiz = lazy(() => import('./pages/student/QuickQuiz'))
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'))
const AdminChapters = lazy(() => import('./pages/admin/AdminChapters'))
const AdminChaptersImport = lazy(() => import('./pages/admin/AdminChaptersImport'))
const AdminQuestions = lazy(() => import('./pages/admin/AdminQuestions'))
const AdminExams = lazy(() => import('./pages/admin/AdminExams'))
const AdminSeminars = lazy(() => import('./pages/admin/AdminSeminars'))
const AdminCompetitions = lazy(() => import('./pages/admin/AdminCompetitions'))
const AdminExamResults = lazy(() => import('./pages/admin/AdminExamResults'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminImport = lazy(() => import('./pages/admin/AdminImport'))
const AdminPdfImport = lazy(() => import('./pages/admin/AdminPdfImport'))
const AdminImportQuiz = lazy(() => import('./pages/admin/AdminImportQuiz'))
const ExamMonitoring = lazy(() => import('./pages/admin/ExamMonitoring'))

// ── Loading fallback ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    </div>
  )
}

function LoadingFallback({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" />
  // BUG-004: only explicit 'approved' (or admins) may pass. Previously only
  // 'pending'/'rejected' were blocked, so a user with verification null
  // (legacy accounts, users created outside the register flow) slipped through
  // to student pages. Treat anything that is not 'approved' as blocked.
  if (user.verification !== 'approved' && !user.isAdmin) {
    return <LoadingFallback><PendingApproval /></LoadingFallback>
  }
  return <Layout>{children}</Layout>
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" />
  if (!user.isAdmin) return <Navigate to="/dashboard" />
  return <Layout>{children}</Layout>
}



export default function App() {
  return (
    <ErrorBoundary>
      <LoadingFallback>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/gdpr" element={<Gdpr />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
          <Route path="/courses/:documentId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
          <Route path="/courses/:documentId/chapters/:chapterDocumentId" element={<ProtectedRoute><ChapterDetail /></ProtectedRoute>} />
          <Route path="/courses/:documentId/quiz" element={<ProtectedRoute><QuickQuiz /></ProtectedRoute>} />
          <Route path="/exam/:documentId" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
          <Route path="/admin/chapters" element={<AdminRoute><AdminChapters /></AdminRoute>} />
          <Route path="/admin/chapters/import" element={<AdminRoute><AdminChaptersImport /></AdminRoute>} />
          <Route path="/admin/questions" element={<AdminRoute><AdminQuestions /></AdminRoute>} />
          <Route path="/admin/exams" element={<AdminRoute><AdminExams /></AdminRoute>} />
          <Route path="/admin/seminars" element={<AdminRoute><AdminSeminars /></AdminRoute>} />
          <Route path="/admin/competitions" element={<AdminRoute><AdminCompetitions /></AdminRoute>} />
          <Route path="/admin/results" element={<AdminRoute><AdminExamResults /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/import" element={<AdminRoute><AdminImport /></AdminRoute>} />
          <Route path="/admin/import-pdf" element={<AdminRoute><AdminPdfImport /></AdminRoute>} />
          <Route path="/admin/import-quiz" element={<AdminRoute><AdminImportQuiz /></AdminRoute>} />
          <Route path="/admin/exams/:examDocumentId/monitoring" element={<AdminRoute><ExamMonitoring /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </LoadingFallback>
    </ErrorBoundary>
  )
}
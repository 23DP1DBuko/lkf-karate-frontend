// pages/student/UserDashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import {
  ChartBarIcon,
  ClockIcon,
  AcademicCapIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { SkeletonCard, SkeletonList, SkeletonTable } from '../../components/Skeleton'
import { useState } from 'react'

export default function UserDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
    const [selectedExam, setSelectedExam] = useState(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => api.get('/dashboard').then(r => {
        console.log('DASHBOARD DATA', r.data)
        return r.data
    }),
    enabled: !!user?.id,
    })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <SkeletonCard />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8">
            <SkeletonCard />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <SkeletonList count={3} />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-5 xl:col-span-4">
            <SkeletonCard />
          </div>
          <div className="col-span-12 md:col-span-7 xl:col-span-8">
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  const greeting = data?.greeting || getGreeting()
  const stats = data?.stats || {}
  const lastResults = data?.lastResults || []
  const upcomingExam = data?.upcomingExam || null

  return (
    <div className="space-y-6">
      {/* Row 1: Greeting */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <GreetingCard user={user} greeting={greeting} />
        </div>
      </div>

      {/* Row 2: Progress (8) + Last Results (4) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8">
          <ProgressCard stats={stats} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <LastResultsCard results={lastResults} />
        </div>
      </div>

      {/* Row 3: Upcoming Exam (4) + Achievements (8) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-5 xl:col-span-4">
          <UpcomingExamCard
            exam={upcomingExam}
            onClick={() => setSelectedExam(upcomingExam)}
          />
        </div>
        <div className="col-span-12 md:col-span-7 xl:col-span-8">
          <AchievementsCard />
        </div>
      </div>

      {/* Row 4: Calendar (full width placeholder) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <CalendarPlaceholderCard />
        </div>
      </div>
    {/* Modal */}
      {selectedExam && (
        <UpcomingExamModal
          exam={selectedExam}
          onClose={() => setSelectedExam(null)}
        />
      )}
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const cardBase =
  'rounded-2xl border border-zinc-800/60 bg-zinc-900/80 text-zinc-100 ' +
  'shadow-sm transition-all duration-200 ease-out ' +
  'hover:-translate-y-0.5 hover:border-zinc-700/80 ' +
  'hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]'

function GreetingCard({ user, greeting }) {
  const initials =
    (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')

  return (
    <section className={`${cardBase} p-6 flex items-center justify-between`}>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-semibold text-zinc-100">
          {initials || '?'}
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-50">
            {greeting}, {user?.firstName || user?.username}
          </h1>
          <p className="text-sm text-zinc-400">
            Signed in as <span className="text-zinc-200">{user?.email}</span>
          </p>
        </div>
      </div>
      {/* future: rank/club chip on the right */}
    </section>
  )
}

function ProgressCard({ stats }) {
  const { t } = useTranslation()
  const {
    quizCount = 0,
    examCount = 0,
    studyHours = 0,
    completedExams = 0,
    } = stats || {}

    const items = [
    { label: t('dashboard.quizzes', 'Quizzes completed'), value: quizCount },
    { label: t('dashboard.examsTaken', 'Exams taken (year)'), value: examCount },
    { label: t('dashboard.studyHours', 'Study hours'), value: studyHours },
    { label: t('dashboard.examsCompleted', 'Exams passed (year)'), value: completedExams },
    ]

  return (
    <section className={`${cardBase} p-6`}>
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-zinc-500" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
            Progress overview
          </h2>
        </div>
      </header>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item.label}>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              {item.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-zinc-50">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function LastResultsCard({ results }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items = results?.slice(0, 3) || []

    const handleClick = (attempt) => {
    navigate(`/results`)
  }

  return (
    <section className={`${cardBase} p-6 flex flex-col`}>
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-zinc-500" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
            Recent results
          </h2>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="mt-2 text-sm text-zinc-500">
          <p>Looks like you have not taken any tests yet.</p>
          <button
            onClick={() => navigate('/courses')}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            Try your first quiz →
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(a => (
            <li
            key={a.id}
            onClick={() => handleClick(a)}
            className="flex items-center justify-between rounded-lg px-3 py-2 bg-zinc-900/60 cursor-pointer hover:bg-zinc-800/80"
            >
              <div className="min-w-0">
                <p className="text-sm text-zinc-100 truncate">
                  {a.exam?.title || a.course?.title || 'Untitled'}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(a.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="ml-3 text-right">
                <p className="text-sm font-semibold text-zinc-50">
                  {typeof a.score === 'number' ? `${a.score}%` : '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function UpcomingExamCard({ exam, onClick }) {
  const { t } = useTranslation()
    const navigate = useNavigate()

  if (!exam) {
    return (
      <section className={`${cardBase} p-6`}>
        <header className="flex items-center gap-2 mb-2">
          <ClockIcon className="h-5 w-5 text-zinc-500" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
            Upcoming exam
          </h2>
        </header>
        <p className="text-sm text-zinc-500">
          No upcoming exams. Enjoy your free time and keep learning.
        </p>
      </section>
    )
  }

  return (
    <button
      className={`${cardBase} p-6 w-full text-left`}
      onClick={onClick}   // open modal
    >
      <header className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="h-5 w-5 text-zinc-500" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
            {exam.title}
          </h2>
        </div>
        <ChevronRightIcon className="h-5 w-5 text-zinc-500" />
      </header>
      <p className="text-sm text-zinc-400">
        Opens in {exam.opensInHuman}
      </p>
    </button>
  )
}

function UpcomingExamModal({ exam, onClose }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!exam) return null

  const handleGoToExam = () => {
    navigate(`/exam/${exam.documentId || exam.id}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className={`${cardBase} max-w-lg w-full mx-4 p-6 relative`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <header className="mb-4">
          <div className="flex items-center gap-2">
            <AcademicCapIcon className="h-6 w-6 text-zinc-500" />
            <h2 className="text-lg font-semibold text-zinc-100">
              {exam.title}
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {t('dashboard.examOpensIn', 'Exam opens in')}: {exam.opensInHuman}
          </p>
        </header>

        {/* You can extend this with more info from your exam model later */}
        <div className="space-y-2 text-sm text-zinc-300">
          <p>
            {t(
              'dashboard.examInfoHint',
              'This is your next scheduled exam. Make sure you have completed the required practice and are ready on time.'
            )}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-200 hover:bg-zinc-800/80"
          >
            {t('common.close', 'Close')}
          </button>
          <button
            onClick={handleGoToExam}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500"
          >
            {t('dashboard.goToExam', 'Go to exam')}
          </button>
        </div>
      </div>
    </div>
  )
}

function AchievementsCard() {
  return (
    <section className={`${cardBase} p-6`}>
      <header className="mb-2">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
          Achievements
        </h2>
      </header>
      <p className="text-sm text-zinc-500">
        No achievements yet. Keep learning to unlock your first badge.
      </p>
    </section>
  )
}

function CalendarPlaceholderCard() {
  return (
    <section className={`${cardBase} p-6`}>
      <header className="mb-2">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
          Calendar
        </h2>
      </header>
      <p className="text-sm text-zinc-500">
        Competition and seminar calendar coming soon.
      </p>
    </section>
  )
}
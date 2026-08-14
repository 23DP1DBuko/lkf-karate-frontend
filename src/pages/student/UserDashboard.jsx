import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/useAuth'
import api, { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/useTheme'
import {
  ChartBarIcon,
  ClockIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  TrophyIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { useNavigate } from 'react-router-dom'
import { SkeletonCard } from '../../components/Skeleton'
import CalendarCard from '../../components/CalendarCard'
import { mediaUrl } from '../../api/media'
import { useState } from 'react'

const cardClass = 'rounded-2xl p-6 border shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md'
const cardStyle = { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }
const cardHeader = 'flex items-center gap-2.5 mb-4'
const cardIconWrap = 'w-9 h-9 rounded-xl flex items-center justify-center'
const cardIcon = 'w-5 h-5 flex-shrink-0'
const cardTitle = 'text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100'
const pillGreen = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border dark:border-emerald-500/20'
const pillAmber = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 dark:border dark:border-amber-500/20'
const pillMuted = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400 dark:border dark:border-slate-500/20'

export default function UserDashboard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [showExamModal, setShowExamModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    enabled: !!user?.id,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3"><SkeletonCard /></div>
        <div className="md:col-span-2"><SkeletonCard /></div>
        <div className="md:col-span-1"><SkeletonCard /></div>
        <div className="md:col-span-1"><SkeletonCard /></div>
        <div className="md:col-span-2"><SkeletonCard /></div>
        <div className="md:col-span-3"><SkeletonCard /></div>
      </div>
    )
  }

  const greeting = data?.greeting || t(getGreetingKey())
  const stats = data?.stats || {}
  const lastResults = data?.lastResults || []
  const upcomingExam = data?.upcomingExam || null

  return (
    <div className="min-h-screen w-full p-4 md:p-8">  {/* Bento grid container layout */}
  <div className="max-w-6xl mx-auto flex flex-col gap-6">
    
    {/* Row 1: Welcome Banner (Full Width) */}
    <div className="w-full">
      <WelcomeCard user={user} greeting={greeting} />
    </div>

    {/* Split Layout for independent vertical stacking */}
    <div className="flex flex-col md:flex-row gap-6 items-start">
      
      {/* LEFT SIDE COLUMN (Occupies 2/3 Width) */}
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        <ProgressCard stats={stats} />
        <ExamsOverviewCard stats={stats} isDark={isDark} />
      </div>

      {/* RIGHT SIDE COLUMN (Occupies 1/3 Width) */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <RecentResultsCard results={lastResults} isDark={isDark} />
        <ExamTriggerCard exam={upcomingExam} onClick={() => setShowExamModal(true)} />
      </div>

    </div>

    {/* Row 4: Calendar (Full Width at Bottom) */}
    <div className="w-full">
      <CalendarCard />
    </div>

  </div>

  {/* Exam modal */}
  {showExamModal && upcomingExam && (
    <ExamModal exam={upcomingExam} onClose={() => setShowExamModal(false)} isDark={isDark} />
  )}
</div>

  )
}

function getGreetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'dashboard.greetingMorning'
  if (h < 18) return 'dashboard.greetingAfternoon'
  return 'dashboard.greetingEvening'
}

/* ─── Welcome Banner ─── */
function WelcomeCard({ user, greeting }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')
  const avatarUrl = mediaUrl(user?.profilePicture?.url)
  return (
    <section className={`${cardClass} relative overflow-hidden`} style={cardStyle}>
      {/* Color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
      <div className="flex items-center gap-5">
        {/* Gradient ring — avatar image, falls back to initials */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 p-[2px] flex-shrink-0 shadow-lg shadow-blue-600/20">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Profile picture'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className={`w-full h-full rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-900' : 'bg-white'
            }`}>
              <span className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-blue-600'}`}>
                {initials || '?'}
              </span>
            </div>
          )}
        </div>
        <div>
          <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {greeting}, {user?.firstName || user?.username}
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {user?.email}
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─── Progress Overview ─── */
function ProgressCard({ stats }) {
  const { t } = useTranslation()
  const { quizCount = 0, examCount = 0, studyHours = 0, completedExams = 0 } = stats || {}
  const items = [
    { key: 'quizzes', label: t('dashboard.quizzes'), value: quizCount, icon: CheckCircleIcon, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
    { key: 'examsTaken', label: t('dashboard.examsTaken'), value: examCount, icon: AcademicCapIcon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/15' },
    { key: 'studyHours', label: t('dashboard.studyHours'), value: studyHours, icon: ClockIcon, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-500/15' },
    { key: 'examsCompleted', label: t('dashboard.examsCompleted'), value: completedExams, icon: TrophyIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15' },
  ]
  return (
    <section className={`${cardClass} relative overflow-hidden`} style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-sky-400" />
      <header className={cardHeader}>
        <div className={`${cardIconWrap} bg-blue-100 dark:bg-blue-500/15`}>
          <ChartBarIcon className={`${cardIcon} text-blue-600 dark:text-blue-400`} />
        </div>
        <h2 className={cardTitle}>{t('dashboard.recentResults', 'Progress overview')}</h2>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {items.map(item => (
          <div
            key={item.key}

          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.bg}`}>
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              </div>
              <dt className="text-[11px] text-slate-600 dark:text-slate-400 truncate">{item.label}</dt>
            </div>
            <dd className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">{item.value}</dd>
          </div>
        ))}
      </div>

      
    </section>
  )
}

/* ─── Recent Results ─── */
function RecentResultsCard({ results, isDark }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const items = results?.slice(0, 3) || []

  if (items.length === 0) {
    return (
      <section className={`${cardClass} relative overflow-hidden`} style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
        <header className={cardHeader}>
          <div className={`${cardIconWrap} bg-emerald-100 dark:bg-emerald-500/15`}>
            <ClockIcon className={`${cardIcon} text-emerald-600 dark:text-emerald-400`} />
          </div>
          <h2 className={cardTitle}>{t('dashboard.recentResults', 'Recent results')}</h2>
        </header>
        <p className="text-sm text-slate-500">{t('dashboard.noResults')}</p>
      </section>
    )
  }

  return (
    <section className={`${cardClass} relative overflow-hidden`} style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
      <header className={cardHeader}>
        <div className={`${cardIconWrap} bg-emerald-100 dark:bg-emerald-500/15`}>
          <ClockIcon className={`${cardIcon} text-emerald-600 dark:text-emerald-400`} />
        </div>
        <h2 className={cardTitle}>{t('dashboard.recentResults', 'Recent results')}</h2>
      </header>
      <ul className="space-y-2.5 flex-1">
        {items.map(a => {
          const score = typeof a.score === 'number' ? a.score : null
          const badge = score === null ? pillMuted
            : score >= 80 ? pillGreen
            : score >= 50 ? pillAmber
            : pillMuted
          return (
            <li key={a.id} onClick={() => navigate('/results')}
              className={`flex items-center justify-between rounded-xl px-3.5 py-3 cursor-pointer transition-all border ${
                isDark
                  ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] hover:border-emerald-500/30'
                  : 'bg-emerald-50/50 hover:bg-emerald-100/80 border-emerald-100/60 hover:border-emerald-300'
              }`}>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                  title={a.exam?.title || getLocalizedField(a.course, i18n.language, 'title') || 'Untitled'}
                >
                  {a.exam?.title || getLocalizedField(a.course, i18n.language, 'title') || 'Untitled'}
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {new Date(a.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="ml-3 flex-shrink-0">
                <span className={badge}>
                  {score !== null ? `${score}%` : '—'}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ─── Exams Overview ─── */
function ExamsOverviewCard({ stats, isDark }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { examCount = 0, completedExams = 0, quizCount = 0 } = stats || {}
  const passRate = examCount > 0 ? Math.round((completedExams / examCount) * 100) : 0

  const statItems = [
    {
      key: 'examsTakenShort',
      label: t('dashboard.examsTakenShort'),
      value: examCount,
      icon: DocumentTextIcon,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-500/10',
    },
    {
      key: 'passedShort',
      label: t('dashboard.passedShort'),
      value: completedExams,
      icon: CheckCircleIcon,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-500/10',
    },
    {
      key: 'quiz30Days',
      label: t('dashboard.quiz30Days'),
      value: quizCount,
      icon: TrophyIcon,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-500/10',
    },
  ]

  return (
    <section className={`${cardClass} relative overflow-hidden`} style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-400" />
      <header className={cardHeader}>
        <div className={`${cardIconWrap} bg-blue-100 dark:bg-blue-500/15`}>
          <ArrowTrendingUpIcon className={`${cardIcon} text-blue-600 dark:text-blue-400`} />
        </div>
        <h2 className={cardTitle}>{t('dashboard.examOverview')}</h2>
      </header>

      {/* Stat badges */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {statItems.map(item => (
          <div
            key={item.key}
            className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 ${item.bg}`}
          >
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <dd className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {item.value}
            </dd>
            <dt className={`text-[10px] leading-tight text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {item.label}
            </dt>
          </div>
        ))}
      </div>

      {/* Pass rate bar */}
      {examCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('dashboard.passRate')}</span>
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{passRate}%</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                passRate >= 80
                  ? 'bg-emerald-500'
                  : passRate >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${passRate}%` }}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => navigate('/courses')}
        className={`group mt-auto flex items-center justify-between w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all border ${
          isDark
            ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-blue-500/30 text-slate-200'
            : 'bg-blue-50 border-blue-200/60 hover:bg-blue-100 hover:border-blue-300 text-blue-700'
        }`}
      >
        <span>{t('dashboard.goToCourses')}</span>
        <ArrowRightIcon className={`w-4 h-4 transition-all duration-300 group-hover:translate-x-1 ${
          isDark ? 'text-slate-400 group-hover:text-blue-400' : 'text-blue-400 group-hover:text-blue-600'
        }`} />
      </button>
    </section>
  )
}

/* ─── Exam Trigger ─── */
function ExamTriggerCard({ exam, onClick }) {
  const { t } = useTranslation()
  return (
    <button onClick={onClick} className={`${cardClass} w-full text-left group cursor-pointer relative overflow-hidden`} style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
      <div className="flex items-center justify-between mb-3">
        <div className={cardHeader}>
          <div className={`${cardIconWrap} bg-amber-100 dark:bg-amber-500/15`}>
            <AcademicCapIcon className={`${cardIcon} text-amber-600 dark:text-amber-400`} />
          </div>
          <h2 className={cardTitle}>{t('dashboard.upcomingExam', 'Upcoming exam')}</h2>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all duration-300" />
      </div>
      {exam ? (
        <>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{exam.title}</p>
          <p className="text-xs text-slate-500 mt-1">
            {t('dashboard.examOpensIn', 'Opens in')}: {exam.opensInHuman}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-600">{t('dashboard.noUpcomingExams', 'No upcoming exams')}</p>
      )}
    </button>
  )
}


/* ─── Exam Modal ─── */
function ExamModal({ exam, onClose, isDark }) {
  const { t } = useTranslation()
  if (!exam) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`max-w-lg w-full mx-4 backdrop-blur-xl border rounded-2xl p-6 shadow-2xl relative ${
        isDark
          ? 'bg-white/[0.02] border-white/[0.08]'
          : 'bg-white border-slate-200'
      }`}>
        <button onClick={onClose}
          className={`absolute top-4 right-4 transition-colors ${
            isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="Close">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <header className="mb-4">
          <div className="flex items-center gap-2">
            <AcademicCapIcon className={`w-5 h-5 ${isDark ? 'text-blue-400/70' : 'text-blue-500'}`} />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{exam.title}</h2>
          </div>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('dashboard.examOpensIn', 'Opens in')}: {exam.opensInHuman}
          </p>
        </header>
        <dl className="grid grid-cols-2 gap-4 mb-4">
          {exam.courseTitle && (
            <div>
              <dt className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('dashboard.course', 'Course')}</dt>
              <dd className={`mt-1 text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{exam.courseTitle}</dd>
            </div>
          )}
          <div>
            <dt className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('dashboard.questionCount', 'Questions')}</dt>
            <dd className={`mt-1 text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{exam.questionCount}</dd>
          </div>
          {exam.passingScore != null && (
            <div>
              <dt className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('dashboard.passingScore', 'Passing score')}</dt>
              <dd className={`mt-1 text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{exam.passingScore}%</dd>
            </div>
          )}
        </dl>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.examInfoHint', 'This exam has not started yet. Come back once it opens to begin your attempt.')}</p>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose}
            className={`px-5 py-2 text-sm font-medium rounded-xl transition-all border ${
              isDark
                ? 'text-slate-200 bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
                : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
            }`}>
            {t('common.cancel', 'Close')}
          </button>
        </div>
      </div>
    </div>
  )
}
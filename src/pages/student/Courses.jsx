import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../../api/strapi'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useTranslation } from 'react-i18next'

const categoryColors = {
  kata: 'from-blue-600 to-blue-800',
  kumite: 'from-red-500 to-red-700',
  secretary: 'from-green-600 to-green-800',
  seminar: 'from-purple-600 to-purple-800',
}

function CourseCard({ course, chapters, progress }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const courseChapters = chapters?.filter(c => c.course?.documentId === course.documentId) || []
  const seenChapterIds = new Set(
    progress?.filter(p => p.chapter).map(p => p.chapter.documentId) || []
  )

  const seenCount = courseChapters.filter(c => seenChapterIds.has(c.documentId)).length
  const total = courseChapters.length
  const progressPercent = total > 0 ? Math.round((seenCount / total) * 100) : 0

  // Find last visited chapter
  const lastVisited = courseChapters
    .filter(c => seenChapterIds.has(c.documentId))
    .sort((a, b) => b.order - a.order)[0]

  const nextChapter = lastVisited
    ? courseChapters.find(c => c.order === lastVisited.order + 1) || lastVisited
    : courseChapters[0]

  const gradient = categoryColors[course.category] || 'from-blue-600 to-blue-800'

  const handleCardClick = (e) => {
    // Don't navigate if clicking a button or link inside
    if (e.target.closest('button') || e.target.closest('a[data-inner]')) return
    navigate(`/courses/${course.documentId}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className="group rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden flex flex-col md:flex-row"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      role="article"
      aria-label={`Course: ${course.title}`}
    >
      {/* Left — course name */}
      <div className={`bg-gradient-to-br ${gradient} p-6 md:w-52 flex-shrink-0 flex flex-col justify-between`}>
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2">
            {t(`courses.categories.${course.category}`)}
          </p>
          <h2 className="text-white text-2xl font-bold leading-tight">{course.title}</h2>
        </div>
        <Link
          data-inner="true"
          to={`/courses/${course.documentId}`}
          className="text-white/80 hover:text-white text-xs mt-4 inline-flex items-center gap-1 transition-colors"
          onClick={e => e.stopPropagation()}
        >
          {t('course.chapters')} →
        </Link>
      </div>

      {/* Right — chapter progress */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          {nextChapter ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {lastVisited ? `Chapter ${nextChapter.order}` : 'Start here'}
                </span>
                <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {seenCount}/{total}
                </span>
              </div>

              <h3 className="text-base font-semibold mb-3 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                {nextChapter.title}
              </h3>

              {/* Progress bar */}
              <div className="w-full rounded-full h-1.5 mb-4 overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className={`h-1.5 rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          ) : (
            <div className="mb-4">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No chapters available yet
              </p>
            </div>
          )}
        </div>

        {nextChapter && (
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/courses/${course.documentId}/chapters/${nextChapter.documentId}`)
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${gradient} hover:opacity-90 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label={`Continue ${course.title}`}
            >
              {lastVisited ? 'Continue →' : 'Start →'}
            </button>

            {progressPercent === 100 && (
              <span className="text-xs font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                ✓ Completed
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Courses() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const { t } = useTranslation()
  usePageTitle(t('courses.title'))

  const { data, isLoading, isError } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses?filters[published][$eq]=true&sort=title:asc').then(r => r.data.data)
  })

  const { data: allChapters } = useQuery({
    queryKey: ['all-chapters'],
    queryFn: () => api.get('/chapters?populate=course&sort=order:asc&pagination[limit]=200').then(r => r.data.data)
  })

  const { data: progressData } = useQuery({
    queryKey: ['chapter-progress'],
    queryFn: () => api.get('/chapter-progress').then(r => r.data.data)
  })

  const filtered = data?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || course.category === category
    return matchesSearch && matchesCategory
  })

  if (isLoading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
      ))}
    </div>
  )

  if (isError) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-red-500">{t('common.error')}</p>
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-700 mb-2">{t('courses.title')}</h1>
      <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{t('courses.subtitle')}</p>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder={t('courses.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <option value="all">{t('courses.allCategories')}</option>
          <option value="kata">{t('courses.categories.kata')}</option>
          <option value="kumite">{t('courses.categories.kumite')}</option>
          <option value="secretary">{t('courses.categories.secretary')}</option>
          <option value="seminar">{t('courses.categories.seminar')}</option>
        </select>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {t('courses.showing')} {filtered?.length || 0} {t('courses.of')} {data?.length || 0} {t('courses.courses')}
      </p>

      {/* Course Cards */}
      <div className="space-y-4">
        {filtered?.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            chapters={allChapters}
            progress={progressData}
          />
        ))}
      </div>

      {filtered?.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <p style={{ color: 'var(--text-muted)' }}>{t('courses.noMatch')}</p>
          <button
            onClick={() => { setSearch(''); setCategory('all') }}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            {t('courses.clearFilters')}
          </button>
        </div>
      )}
    </div>
  )
}
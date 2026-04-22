/* Courses.jsx */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import api from '../../api/strapi'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useTranslation } from 'react-i18next'

const categoryLabels = {
  kata: 'Kata',
  kumite: 'Kumite',
  secretary: 'Secretary',
  seminar: 'Seminar',
}


const categoryColors = {
  kata: 'bg-blue-100 text-blue-700',
  kumite: 'bg-red-100 text-red-700',
  secretary: 'bg-green-100 text-green-700',
  seminar: 'bg-purple-100 text-purple-700',
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

  const filtered = data?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || course.category === category
    return matchesSearch && matchesCategory
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
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

      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder={t('courses.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }}
        >
          <option value="all">{t('courses.allCategories')}</option>
          <option value="kata">{t('courses.categories.kata')}</option>
          <option value="kumite">{t('courses.categories.kumite')}</option>
          <option value="secretary">{t('courses.categories.secretary')}</option>
          <option value="seminar">{t('courses.categories.seminar')}</option>
        </select>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {t('courses.showing')} {filtered?.length || 0} {t('courses.of')} {data?.length || 0} {t('courses.courses')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered?.map(course => (
          <Link
            key={course.id}
            to={`/courses/${course.documentId}`}
            className="rounded-xl shadow hover:shadow-md transition p-6 block"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{course.title}</h2>
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2 ${categoryColors[course.category]}`}>
                {t(`courses.categories.${course.category}`)}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{course.description}</p>
          </Link>
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
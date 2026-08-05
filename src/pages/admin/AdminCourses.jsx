import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import api, { getLocalizedField } from '../../api/strapi'
import IconButton from '../../components/IconButton'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { SkeletonTable } from '../../components/Skeleton'
import ErrorState from '../../components/ErrorState'
import { useTranslation } from 'react-i18next'

const categoryLabels = {
  kata: 'Kata',
  kumite: 'Kumite',
  secretary: 'Secretary',
  seminar: 'Seminar',
}

const languages = [
  { code: 'lv', label: 'LV' },
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
]

export default function AdminCourses() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [form, setForm] = useState({
    titleLv: '', titleRu: '', titleEn: '',
    descriptionLv: '', descriptionRu: '', descriptionEn: '',
    category: 'kata', publishedAt: null,
  })

  const { data: courses, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      // Fetch published and draft courses separately.
      // Using `status=preview` returns the working draft version for ALL
      // documents, which always has publishedAt: null. Instead we fetch
      // published (default, no status param) and draft courses and merge them
      // so the publishedAt field is correctly populated.
      const [published, drafts] = await Promise.all([
        api.get('/courses?sort=titleLv:asc&pagination[page]=1&pagination[pageSize]=200').then(r => r.data.data),
        api.get('/courses?sort=titleLv:asc&pagination[page]=1&pagination[pageSize]=200&status=draft').then(r => r.data.data),
      ])
      return [...published, ...drafts]
    }
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/courses', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data }) => api.put(`/courses/${documentId}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/courses/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
  })

  const resetForm = () => {
    setForm({ titleLv: '', titleRu: '', titleEn: '', descriptionLv: '', descriptionRu: '', descriptionEn: '', category: 'kata', publishedAt: null })
    setShowForm(false)
    setEditingCourse(null)
  }

  const handleEdit = (course) => {
    setEditingCourse(course)
    setForm({
      titleLv: course.titleLv || '',
      titleRu: course.titleRu || '',
      titleEn: course.titleEn || '',
      descriptionLv: course.descriptionLv || '',
      descriptionRu: course.descriptionRu || '',
      descriptionEn: course.descriptionEn || '',
      category: course.category,
      publishedAt: course.publishedAt || null,
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const primaryTitle = form.titleLv || form.titleEn || ''
    const slug = primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const data = {
      ...form,
      slug,
    }
    if (editingCourse) {
      updateMutation.mutate({ documentId: editingCourse.documentId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (documentId) => {
    if (window.confirm(t('admin.courses.deleteConfirm'))) {
      deleteMutation.mutate(documentId)
    }
  }

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} title="Failed to load courses" />
  }

  if (isLoading) return <SkeletonTable rows={5} cols={4} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('admin.courses.title')}</h1>
          <p className="text-gray-500">{t('admin.courses.total', { count: courses?.length || 0 })}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {t('admin.courses.new')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl shadow p-5 sm:p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold mb-4">
            {editingCourse ? t('admin.courses.edit') : t('admin.courses.create')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title translations */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('admin.courses.titleLabel')}
              </p>
              {languages.map(lang => (
                <div key={lang.code}>
                  <label className="block text-sm font-medium mb-1" htmlFor={`course-title-${lang.code}`}>
                    {t('admin.courses.titleLabel')} <span className="text-xs text-gray-400">({lang.label})</span>
                  </label>
                  <input
                    id={`course-title-${lang.code}`}
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form[`title${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`]}
                    onChange={e => {
                      const key = `title${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`
                      setForm({ ...form, [key]: e.target.value })
                    }}
                    lang={lang.code}
                  />
                </div>
              ))}
            </div>

            {/* Description translations */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('admin.courses.descriptionLabel')}
              </p>
              {languages.map(lang => (
                <div key={lang.code}>
                  <label className="block text-sm font-medium mb-1" htmlFor={`course-desc-${lang.code}`}>
                    {t('admin.courses.descriptionLabel')} <span className="text-xs text-gray-400">({lang.label})</span>
                  </label>
                  <textarea
                    id={`course-desc-${lang.code}`}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={form[`description${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`]}
                    onChange={e => {
                      const key = `description${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`
                      setForm({ ...form, [key]: e.target.value })
                    }}
                    lang={lang.code}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1" htmlFor="course-category">{t('admin.courses.categoryLabel')}</label>
                <select
                  id="course-category"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="kata">Kata</option>
                  <option value="kumite">Kumite</option>
                  <option value="secretary">Secretary</option>
                  <option value="seminar">Seminar</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.publishedAt}
                    onChange={e => setForm({ ...form, publishedAt: e.target.checked ? new Date().toISOString() : null })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium">{t('admin.courses.published')}</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingCourse ? t('admin.courses.updateBtn') : t('admin.courses.createBtn')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50"
              >
                {t('admin.courses.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {courses?.map(course => (
          <div key={course.id} className="rounded-xl p-4 shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {getLocalizedField(course, i18n.language, 'title') || course.titleLv}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t(`admin.courses.categories.${course.category}`, categoryLabels[course.category])}</p>
              </div>
              <div className="flex gap-1">
                <IconButton icon={PencilIcon} label={t('admin.courses.iconEdit')} onClick={() => handleEdit(course)} variant="default" size="sm" />
                <IconButton icon={TrashIcon} label={t('admin.courses.iconDelete')} onClick={() => handleDelete(course.documentId)} variant="danger" size="sm" />
              </div>
            </div>              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.publishedAt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {course.publishedAt ? t('admin.courses.published') : t('admin.courses.draft')}
            </span>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.courses.colTitle')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.courses.colStatus')}</th>
              <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.courses.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses?.map(course => (
              <tr key={course.id} className="border-b hover:opacity-80 transition" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {getLocalizedField(course, i18n.language, 'title') || course.titleLv}
                  {i18n.language && course[`title${i18n.language === 'lv' ? 'En' : i18n.language === 'ru' ? 'Lv' : 'Lv'}`] && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({getLocalizedField(course, 'lv', 'title') || course.titleLv})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${course.publishedAt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {course.publishedAt ? t('admin.courses.published') : t('admin.courses.draft')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={PencilIcon} label={t('admin.courses.iconEdit')} onClick={() => handleEdit(course)} variant="default" size="sm" />
                    <IconButton icon={TrashIcon} label={t('admin.courses.iconDelete')} onClick={() => handleDelete(course.documentId)} variant="danger" size="sm" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import api, { getLocalizedField } from '../../api/strapi'
import IconButton from '../../components/IconButton'
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import DateTimeStepPicker from '../../components/DateTimeStepPicker'
import { SkeletonTable } from '../../components/Skeleton'
import ErrorState from '../../components/ErrorState'
import { useTranslation } from 'react-i18next'

export default function AdminExams() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const deleteModalRef = useRef(null)
  useFocusTrap(deleteModalRef)
  const [questionsError, setQuestionsError] = useState('')
  const [form, setForm] = useState({
    title: '', duration: 30, questionCount: 10, passingScore: 70,
    openAt: '', closeAt: '', course: '', showResults: true,
    selectedQuestions: []
  })

  const toDateTimeLocal = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const { data: exams, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: () => api.get('/exams?populate[course]=true&populate[questions]=true&sort=createdAt:desc').then(r => r.data.data)
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=titleLv:asc&pagination[page]=1&pagination[pageSize]=200').then(r => r.data.data)
  })

  const { data: courseQuestions } = useQuery({
    queryKey: ['course-questions', form.course],
    queryFn: async () => {
      let page = 1
      let all = []
      while (true) {
        const res = await api.get('/questions', {
          params: {
            'filters[course][documentId][$eq]': form.course,
            'pagination[page]': page,
            'pagination[pageSize]': 100,
            'populate[media]': 'true',
            'sort': 'order:asc',
          },
        })
        const items = res.data.data || []
        all = [...all, ...items]
        const { pagination } = res.data.meta
        if (page >= pagination.pageCount) break
        page++
      }
      return all
    },
    enabled: !!form.course
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/exams', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] })
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data }) => api.put(`/exams/${documentId}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] })
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/exams/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-exams'] })
  })

  const resetForm = () => {
    setForm({
      title: '', duration: 30, questionCount: 10, passingScore: 70,
      openAt: '', closeAt: '', course: '', showResults: true,
      selectedQuestions: []
    })
    setShowForm(false)
    setEditingExam(null)
    setQuestionsError('')
  }

  const handleEdit = (exam) => {
    setQuestionsError('')
    setEditingExam(exam)
    setForm({
      title: exam.title,
      duration: exam.duration,
      questionCount: exam.questionCount,
      passingScore: exam.passingScore,
      openAt: toDateTimeLocal(exam.openAt),
      closeAt: toDateTimeLocal(exam.closeAt),
      course: exam.course?.documentId || '',
      showResults: exam.showResults ?? true,
      selectedQuestions: exam.questions?.map(q => q.documentId) || []
    })
    setShowForm(true)
  }

  const [dateError, setDateError] = useState('')

  const validateDates = (openAt, closeAt, duration) => {
    if (!openAt || !closeAt) return ''

    const start = new Date(openAt)
    const end = new Date(closeAt)
    const mins = Number(duration || 0)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return t('admin.exams.dateErrorInvalid')
    }

    if (end <= start) {
      return t('admin.exams.dateErrorCloseAfterOpen')
    }

    if (mins > 0) {
      const examEndsAt = new Date(start.getTime() + mins * 60 * 1000)
      if (end < examEndsAt) {
        return t('admin.exams.dateErrorDuration')
      }
    }

    return ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const error = validateDates(form.openAt, form.closeAt, form.duration)
    if (error) {
      setDateError(error)
      return
    }

    setDateError('')

    // Exams must have an explicit question set — no random course-pool fallback.
    if (form.selectedQuestions.length === 0) {
      setQuestionsError(
        t('admin.exams.selectQuestionsRequired') ||
          'Select at least one question before saving the exam.'
      )
      return
    }
    setQuestionsError('')

    const data = {
      title: form.title,
      duration: Number(form.duration),
      questionCount: form.selectedQuestions.length > 0
        ? form.selectedQuestions.length
        : Number(form.questionCount),
      passingScore: Number(form.passingScore),
      openAt: form.openAt ? new Date(form.openAt).toISOString() : null,
      closeAt: form.closeAt ? new Date(form.closeAt).toISOString() : null,
      course: form.course ? { connect: [form.course] } : undefined,
      showResults: form.showResults,
      questions: form.selectedQuestions.length > 0
        ? { set: form.selectedQuestions }
        : undefined,
    }

    if (editingExam) {
      updateMutation.mutate({ documentId: editingExam.documentId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (exam) => {
    setDeleteTarget(exam)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.documentId)
    setDeleteTarget(null)
  }

  const toggleQuestion = (documentId) => {
    setQuestionsError('')
    setForm(prev => ({
      ...prev,
      selectedQuestions: prev.selectedQuestions.includes(documentId)
        ? prev.selectedQuestions.filter(id => id !== documentId)
        : [...prev.selectedQuestions, documentId]
    }))
  }

  const selectAll = () => {
    setQuestionsError('')
    setForm(prev => ({
      ...prev,
      selectedQuestions: courseQuestions?.map(q => q.documentId) || []
    }))
  }

  const deselectAll = () => {
    setForm(prev => ({ ...prev, selectedQuestions: [] }))
  }

  const getStatusValue = (exam) => {
    const now = new Date()
    if (exam.openAt && new Date(exam.openAt) > now) return 'scheduled'
    if (exam.closeAt && new Date(exam.closeAt) < now) return 'closed'
    return 'open'
  }

  const getExamStatus = (exam) => {
    const map = {
      scheduled: { label: t('admin.exams.statusScheduled'), color: 'bg-yellow-100 text-yellow-700' },
      open: { label: t('admin.exams.statusOpen'), color: 'bg-green-100 text-green-700' },
      closed: { label: t('admin.exams.statusClosed'), color: 'bg-gray-100 text-gray-500' },
    }
    return map[getStatusValue(exam)] || map.open
  }

  const filtered = exams?.filter(exam => {
    if (filterCourse !== 'all' && exam.course?.documentId !== filterCourse) return false
    if (filterStatus !== 'all' && getStatusValue(exam) !== filterStatus) return false
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      const haystack = [exam.title, getLocalizedField(exam.course, i18n.language, 'title') || exam.course?.titleLv]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} title="Failed to load exams" />
  }

  if (isLoading) return <SkeletonTable rows={5} cols={6} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('admin.exams.title')}</h1>
          <p className="text-gray-500">{t('admin.exams.total', { count: exams?.length || 0 })}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {t('admin.exams.new')}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl shadow p-5 sm:p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold mb-4">
            {editingExam ? t('admin.exams.edit') : t('admin.exams.create')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="exam-course">{t('admin.exams.courseLabel')}</label>
              <select
                id="exam-course"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.course}
                onChange={e => setForm({ ...form, course: e.target.value, selectedQuestions: [] })}
                required
              >
                <option value="">Select a course</option>
                {courses?.map(course => (
                  <option key={course.id} value={course.documentId}>{getLocalizedField(course, i18n.language, 'title') || course.titleLv}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="exam-title">{t('admin.exams.titleLabel')}</label>
              <input
                id="exam-title"
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="exam-duration">{t('admin.exams.durationLabel')}</label>
                <input
                  id="exam-duration"
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.duration}
                  onChange={e => {
                    const next = { ...form, duration: e.target.value }
                    setForm(next)
                    setDateError(validateDates(next.openAt, next.closeAt, next.duration))
                  }}
                  min={1} required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="exam-passing-score">{t('admin.exams.passingScoreLabel')}</label>
                <input
                  id="exam-passing-score"
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.passingScore}
                  onChange={e => setForm({ ...form, passingScore: e.target.value })}
                  min={1} max={100} required
                />
              </div>
              <div className="flex items-end pb-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showResults}
                    onChange={e => setForm({ ...form, showResults: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium">{t('admin.exams.showResults')}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DateTimeStepPicker
                label="Open At (optional)"
                value={form.openAt}
                onChange={(value) => {
                  const next = { ...form, openAt: value }
                  setForm(next)
                  setDateError(validateDates(next.openAt, next.closeAt, next.duration))
                }}
                error=""
                mode="datetime"
                requiredTime={true}
                minuteStep={5}
              />

              <DateTimeStepPicker
                label="Close At (optional)"
                value={form.closeAt}
                onChange={(value) => {
                  const next = { ...form, closeAt: value }
                  setForm(next)
                  setDateError(validateDates(next.openAt, next.closeAt, next.duration))
                }}
                error=""
                mode="datetime"
                requiredTime={true}
                minuteStep={5}
              />
            </div>

            {dateError && (
              <p className="mt-2 text-sm font-medium text-red-600">
                {dateError}
              </p>
            )}

            {/* Question selector */}
            {form.course && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    {t('admin.exams.selectQuestions')}
                    <span className="ml-2 text-blue-600 font-bold">
                      ({form.selectedQuestions.length} {t('admin.exams.selected')})
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {t('admin.exams.selectAll')}
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-xs text-red-500 hover:underline"
                    >
                      {t('admin.exams.deselectAll')}
                    </button>
                  </div>
                </div>

                {!courseQuestions?.length ? (
                  <p className="text-sm text-gray-400 border rounded-lg p-4">
                    {t('admin.exams.noQuestions')}
                  </p>
                ) : (
                  <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                    {courseQuestions?.map((question, i) => {
                      const selected = form.selectedQuestions.includes(question.documentId)
                      return (
                        <label
                          key={question.id}
                          className={`flex items-start gap-3 p-3 cursor-pointer transition ${
                            selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleQuestion(question.documentId)}
                            className="mt-1 accent-blue-600"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              <span className="text-gray-400 mr-1">{i + 1}.</span>
                              {getLocalizedField(question, i18n.language, 'text') || question.textLv}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700'
                                : question.type === 'single_choice' ? 'bg-teal-100 text-teal-700'
                                : question.type === 'yes_no' ? 'bg-purple-100 text-purple-700'
                                : question.type === 'aka_ao' ? 'bg-amber-100 text-amber-700'
                                : 'bg-orange-100 text-orange-700'
                              }`}>
                                {question.type === 'multiple_choice' ? t('admin.questions.mcBadge')
                                : question.type === 'single_choice' ? t('admin.questions.scBadge')
                                : question.type === 'yes_no' ? t('admin.questions.ynBadge')
                                : question.type === 'aka_ao' ? t('admin.questions.akaAoBadge')
                                : t('admin.questions.textBadge')}
                              </span>
                              {question.media?.length > 0 && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {t('admin.exams.mediaLabel')}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {questionsError && (
              <p className="text-sm font-medium text-red-600">
                {questionsError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingExam ? t('admin.exams.updateBtn') : t('admin.exams.createBtn')}
              </button>
              <button type="button" onClick={resetForm} className="border px-6 py-2 rounded-lg hover:bg-gray-50">
                {t('admin.exams.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters: search + course + status */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('admin.exams.searchPlaceholder') || 'Search exams...'}
            aria-label={t('admin.exams.searchPlaceholder') || 'Search exams...'}
            className="w-full border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t('common.clearSearch') || 'Clear search'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:bg-slate-200 dark:hover:bg-slate-700/50"
              style={{ color: 'var(--text-muted)' }}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filterCourse}
          onChange={e => setFilterCourse(e.target.value)}
          aria-label={t('admin.exams.courseLabel')}
        >
          <option value="all">{t('admin.exams.allCourses') || 'All courses'}</option>
          {courses?.map(course => (
            <option key={course.id} value={course.documentId}>{getLocalizedField(course, i18n.language, 'title') || course.titleLv}</option>
          ))}
        </select>
        <select
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          aria-label={t('admin.exams.colStatus')}
        >
          <option value="all">{t('admin.exams.allStatuses') || 'All statuses'}</option>
          <option value="scheduled">{t('admin.exams.statusScheduled')}</option>
          <option value="open">{t('admin.exams.statusOpen')}</option>
          <option value="closed">{t('admin.exams.statusClosed')}</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.exams.colTitle')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.exams.colCourse')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.exams.colDuration')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.exams.colPass')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.exams.colStatus')}</th>
              <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.exams.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t('admin.exams.noResults') || 'No exams match your filters.'}
                  </p>
                  {(searchQuery || filterStatus !== 'all' || filterCourse !== 'all') && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterCourse('all') }}
                      className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      {t('common.clearFilters') || 'Clear filters'}
                    </button>
                  )}
                </td>
              </tr>
            )}
            {filtered?.map(exam => {
              const status = getExamStatus(exam)
              return (
                <tr key={exam.id} className="border-b hover:opacity-80 transition" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{exam.title}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{getLocalizedField(exam.course, i18n.language, 'title') || exam.course?.titleLv || '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{exam.duration}m</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{exam.passingScore}%</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <IconButton
                        icon={EyeIcon}
                        label={t('admin.exams.monitor')}
                        onClick={() => navigate(`/admin/exams/${exam.documentId}/monitoring`)}
                        variant="default"
                        size="sm"
                      />
                      <IconButton icon={PencilIcon} label={t('admin.exams.iconEdit')} onClick={() => handleEdit(exam)} variant="default" size="sm" />
                      <IconButton icon={TrashIcon} label={t('admin.exams.iconDelete')} onClick={() => handleDelete(exam)} variant="danger" size="sm" />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {deleteTarget && (
        <div
          ref={deleteModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-delete-title"
          onKeyDown={e => { if (e.key === 'Escape') setDeleteTarget(null) }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 id="exam-delete-title" className="text-lg font-semibold text-slate-900">
              {t('admin.exams.deleteConfirm')}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t('admin.exams.deleteWarning', { title: deleteTarget.title })}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('admin.exams.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {t('admin.exams.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
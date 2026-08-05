import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import api, { getLocalizedField } from '../../api/strapi'
import MediaUpload from '../../components/MediaUpload'
import RichTextEditor from '../../components/RichTextEditor'
import IconButton from '../../components/IconButton'
import { PencilIcon, TrashIcon, EyeIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import { SkeletonTable } from '../../components/Skeleton'
import ChapterPreviewModal from '../../components/ChapterPreviewModal'
import BlockEditor from '../../components/BlockEditor'
import ErrorState from '../../components/ErrorState'
import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'lv', label: 'LV' },
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
]

export default function AdminChapters() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filterCourse, setFilterCourse] = useState('all')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 25
  const [previewChapter, setPreviewChapter] = useState(null)
  const [form, setForm] = useState({
    titleLv: '', titleRu: '', titleEn: '',
    blocksLv: [], blocksRu: [], blocksEn: [],
    baseLanguage: 'lv',
    videoUrl: '', course: '',
  })
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('base')
  const [isTranslating, setIsTranslating] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [isReordering, setIsReordering] = useState(false)

  const isDragReorder = filterCourse !== 'all' && filterCourse !== ''

  const emptyForm = {
    titleLv: '', titleRu: '', titleEn: '',
    blocksLv: [], blocksRu: [], blocksEn: [],
    baseLanguage: 'lv',
    videoUrl: '', course: '',
  }

  const { data: chapters, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-chapters'],
    queryFn: () =>
      api.get('/chapters?populate[course]=true&populate[media]=true&populate[questions]=true&sort=order:asc&pagination[page]=1&pagination[pageSize]=100')
        .then(r => r.data.data)
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=titleLv:asc&pagination[page]=1&pagination[pageSize]=200').then(r => r.data.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/chapters', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] })
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data }) =>
      api.put(`/chapters/${documentId}`, { data }).catch(err => {
        console.error('Update error:', err.response?.data || err.message)
        throw err
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] })
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/chapters/${documentId}`),
    onSuccess: async (_, deletedDocumentId) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-chapters'] })
      // Reorder remaining chapters in same course
      const remaining = chapters
        ?.filter(c => c.documentId !== deletedDocumentId)
        ?.sort((a, b) => a.order - b.order)
      
      // Group by course and reorder
      const byCourse = {}
      remaining?.forEach(c => {
        const courseId = c.course?.documentId
        if (!byCourse[courseId]) byCourse[courseId] = []
        byCourse[courseId].push(c)
      })

      for (const courseChapters of Object.values(byCourse)) {
        for (let i = 0; i < courseChapters.length; i++) {
          if (courseChapters[i].order !== i + 1) {
            await api.put(`/chapters/${courseChapters[i].documentId}`, {
              data: { order: i + 1 }
            })
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] })
    }
  })

  const resetForm = () => {
    setForm(emptyForm)
    setActiveTab('base')
    setEditingId(null)
    setShowForm(false)
  }

  
  const handleEdit = (chapter) => {
    const baseLanguage = chapter.baseLanguage || 'lv'
    setForm({
      titleLv: chapter.titleLv || '',
      titleRu: chapter.titleRu || '',
      titleEn: chapter.titleEn || '',
      blocksLv: chapter.blocksLv || [],
      blocksRu: chapter.blocksRu || [],
      blocksEn: chapter.blocksEn || [],
      baseLanguage,
      videoUrl: chapter.videoUrl || '',
      course: chapter.course?.documentId || '',
    })
    setActiveTab(baseLanguage)
    setEditingId(chapter.documentId)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    let order
    if (editingId) {
      const existing = chapters?.find(c => c.documentId === editingId)
      order = existing?.order || 1
    } else {
      const courseChapters = chapters?.filter(c => c.course?.documentId === form.course) || []
      order = courseChapters.length > 0
        ? Math.max(...courseChapters.map(c => c.order || 0)) + 1
        : 1
    }

    const bankQuestionIds = [...(form.blocksLv || []), ...(form.blocksRu || []), ...(form.blocksEn || [])]
      .filter(b => b.type === 'bank_question' && b.questionId)
      .map(b => b.questionId)

    const cleanBlocks = (blocks) => (blocks || []).map(block => {
      const { __component, ...rest } = block
      return __component ? { __component, ...rest } : rest
    })

    const data = {
      order,
      course: form.course ? { connect: [form.course] } : undefined,
      titleLv: form.titleLv,
      titleRu: form.titleRu,
      titleEn: form.titleEn,
      blocksLv: cleanBlocks(form.blocksLv),
      blocksRu: cleanBlocks(form.blocksRu),
      blocksEn: cleanBlocks(form.blocksEn),
      baseLanguage: form.baseLanguage,
      videoUrl: form.videoUrl,
      questions: bankQuestionIds.length > 0
        ? { connect: [...new Set(bankQuestionIds)] }
        : undefined,
    }

    if (editingId) {
      updateMutation.mutate({ documentId: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (documentId) => {
    if (window.confirm(t('admin.chapters.deleteConfirm'))) {
      deleteMutation.mutate(documentId)
    }
  }

  const allFiltered = (chapters || [])
    .filter(q => filterCourse === 'all' || q.course?.documentId === filterCourse)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

  const handleDragStart = useCallback((e, chapter) => {
    if (!isDragReorder) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', chapter.documentId)
    setDragId(chapter.documentId)
  }, [isDragReorder])

  const handleDragOver = useCallback((e, chapter) => {
    if (!isDragReorder) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(prev => prev !== chapter.documentId ? chapter.documentId : prev)
  }, [isDragReorder])

  const handleDragLeave = useCallback(() => {
    if (!isDragReorder) return
    setDragOverId(null)
  }, [isDragReorder])

  const handleDrop = useCallback(async (e, targetChapter) => {
    if (!isDragReorder) return
    e.preventDefault()
    setDragOverId(null)

    const sourceId = dragId
    if (!sourceId || sourceId === targetChapter.documentId) {
      setDragId(null)
      return
    }

    // Get the chapters for this course (already sorted)
    const courseChapters = [...allFiltered]
    const sourceIdx = courseChapters.findIndex(c => c.documentId === sourceId)
    const targetIdx = courseChapters.findIndex(c => c.documentId === targetChapter.documentId)
    if (sourceIdx === -1 || targetIdx === -1) {
      setDragId(null)
      return
    }

    // Reorder the array
    const [moved] = courseChapters.splice(sourceIdx, 1)
    const adjustedTarget = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx
    courseChapters.splice(adjustedTarget, 0, moved)

    // Assign new order values (1-based)
    const updates = courseChapters
      .map((ch, i) => ({ documentId: ch.documentId, order: i + 1, originalOrder: ch.order }))
      .filter(u => u.order !== u.originalOrder)

    if (updates.length === 0) {
      setDragId(null)
      return
    }

    setIsReordering(true)
    try {
      await Promise.all(
        updates.map(u =>
          api.put(`/chapters/${u.documentId}`, { data: { order: u.order } })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] })
    } catch (err) {
      console.error('Reorder failed:', err)
    } finally {
      setIsReordering(false)
      setDragId(null)
    }
  }, [isDragReorder, dragId, allFiltered, queryClient])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDragOverId(null)
  }, [])
  const totalPages = Math.max(1, Math.ceil(allFiltered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = allFiltered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const goToPage = (p) => {
    setPage(Math.max(1, Math.min(p, totalPages)))
  }

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} title="Failed to load chapters" />
  }

  if (isLoading) return <SkeletonTable rows={5} cols={4} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('admin.chapters.title')}</h1>
          <p className="text-gray-500">{t('admin.chapters.total', { count: chapters?.length || 0 })}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {t('admin.chapters.new')}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl shadow p-5 sm:p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? t('admin.chapters.edit') : t('admin.chapters.create')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="chapter-course">{t('admin.chapters.courseLabel')}</label>
              <select
                id="chapter-course"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.course}
                onChange={e => setForm({ ...form, course: e.target.value })}
                required
              >
                <option value="">Select a course</option>
                {courses?.map(course => (
                  <option key={course.id} value={course.documentId}>
                    {getLocalizedField(course, i18n.language, 'title') || course.titleLv}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="chapter-base-lang">Base Language</label>
              <select
                id="chapter-base-lang"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.baseLanguage}
                onChange={e => {
                  setForm({ ...form, baseLanguage: e.target.value })
                  setActiveTab('base')
                }}
              >
                <option value="lv">Latviešu (LV)</option>
                <option value="ru">Русский (RU)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>

            {/* Language Tabs (shown after translate) */}
            {activeTab !== 'base' && (
              <div className="flex gap-1 border-b pb-1" style={{ borderColor: 'var(--border)' }}>
                {languages.map(lang => {
                  const isActive = activeTab === lang.code
                  const hasContent = form[`title${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`]
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setActiveTab(lang.code)}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                        isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                      }`}
                    >
                      {lang.label} {hasContent ? '✓' : ''}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Title for active language */}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="chapter-title">
                {t('admin.chapters.titleLabel')} {activeTab !== 'base' && `(${activeTab.toUpperCase()})`}
                {form.baseLanguage === activeTab && <span className="text-xs text-blue-500 ml-1">(base)</span>}
              </label>
              <input
                id="chapter-title"
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={activeTab === 'base'
                  ? (form[`title${form.baseLanguage.charAt(0).toUpperCase() + form.baseLanguage.slice(1)}`] || '')
                  : (form[`title${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`] || '')
                }
                onChange={e => {
                  const lang = activeTab === 'base' ? form.baseLanguage : activeTab
                  const key = `title${lang.charAt(0).toUpperCase() + lang.slice(1)}`
                  setForm({ ...form, [key]: e.target.value })
                }}
                required
                lang={activeTab === 'base' ? form.baseLanguage : activeTab}
              />
            </div>

            {/* Translate button (only in base mode) */}
            {activeTab === 'base' && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={async () => {
                    setIsTranslating(true)
                    const baseLang = form.baseLanguage
                    const baseKey = `title${baseLang.charAt(0).toUpperCase() + baseLang.slice(1)}`
                    const baseBlocksKey = `blocks${baseLang.charAt(0).toUpperCase() + baseLang.slice(1)}`
                    const baseTitle = form[baseKey] || ''
                    const baseBlocks = form[baseBlocksKey] || []

                    await new Promise(r => setTimeout(r, 1500))

                    const otherLangs = languages.filter(l => l.code !== baseLang)
                    const updates = {}
                    for (const lang of otherLangs) {
                      const tKey = `title${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`
                      const bKey = `blocks${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`
                      updates[tKey] = baseTitle
                      updates[bKey] = JSON.parse(JSON.stringify(baseBlocks))
                    }
                    setForm({ ...form, ...updates })
                    setIsTranslating(false)
                    setActiveTab(baseLang)
                  }}
                  disabled={isTranslating}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isTranslating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>🌐 Translate</>
                  )}
                </button>
              </div>
            )}

            {/* Video URL */}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="chapter-video">Video URL</label>
              <input
                id="chapter-video"
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.videoUrl}
                onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/..."
              />
            </div>

            {/* Blocks for active language */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {t('admin.chapters.contentLabel')} {activeTab !== 'base' && `(${activeTab.toUpperCase()})`}
              </p>
              {(() => {
                const lang = activeTab === 'base' ? form.baseLanguage : activeTab
                const blocksKey = `blocks${lang.charAt(0).toUpperCase() + lang.slice(1)}`
                return (
                  <BlockEditor
                    blocks={form[blocksKey] || []}
                    onChange={blocks => setForm({ ...form, [blocksKey]: blocks })}
                    courseId={form.course}
                  />
                )
              })()}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingId ? t('admin.chapters.updateBtn') : t('admin.chapters.createBtn')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50"
              >
                {t('admin.chapters.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filterCourse}
          onChange={e => { setFilterCourse(e.target.value); setPage(1) }}
        >
          <option value="all">{t('admin.chapters.allCourses')}</option>
          {courses?.map(course => (
            <option key={course.id} value={course.documentId}>{getLocalizedField(course, i18n.language, 'title') || course.titleLv}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <tr>
              {isDragReorder && (
                <th className="w-10 px-2 py-3 text-sm font-medium text-center" style={{ color: 'var(--text-muted)' }}>
                  <ArrowsUpDownIcon className="w-4 h-4 mx-auto" />
                </th>
              )}
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.chapters.colTitle')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Lang</th>
              {!isDragReorder && (
                <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.chapters.colCourse')}</th>
              )}
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.chapters.colOrder')}</th>
              <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.chapters.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((chapter) => {
              const isDragging = dragId === chapter.documentId
              const isDragOver = dragOverId === chapter.documentId
              return (
                <tr
                  key={chapter.id}
                  draggable={isDragReorder}
                  onDragStart={(e) => handleDragStart(e, chapter)}
                  onDragOver={(e) => handleDragOver(e, chapter)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, chapter)}
                  onDragEnd={handleDragEnd}
                  className={`border-b transition ${
                    isDragging ? 'opacity-40 bg-blue-50' : ''
                  } ${isDragOver ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/50' : ''} ${
                    isDragReorder ? 'cursor-grab active:cursor-grabbing select-none' : ''
                  }`}
                  style={{ borderColor: 'var(--border)' }}
                >
                  {isDragReorder && (
                    <td className="px-2 py-3 text-center">
                      <ArrowsUpDownIcon className="w-4 h-4 mx-auto" style={{ color: 'var(--text-muted)' }} />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {getLocalizedField(chapter, i18n.language, 'title') || chapter.titleLv}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {['lv', 'ru', 'en'].map(l => {
                        const key = `title${l.charAt(0).toUpperCase() + l.slice(1)}`
                        const filled = !!chapter[key]
                        return (
                          <span
                            key={l}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              filled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {l.toUpperCase()}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  {!isDragReorder && (
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{getLocalizedField(chapter.course, i18n.language, 'title') || '—'}</td>
                  )}
                  <td className={`px-4 py-3 text-sm font-medium ${isDragReorder ? 'text-center' : ''}`} style={{ color: isDragReorder ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {chapter.order}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <IconButton
                          icon={EyeIcon}
                          type="button"
                          label={t('admin.chapters.iconPreview')}
                          onClick={async () => {
                            try {
                              const res = await api.get(`/chapters/${chapter.documentId}?populate[course]=true&populate[media]=true&populate[questions]=true`)
                              setPreviewChapter(res.data.data)
                            } catch (err) {
                              console.error('Preview load failed:', err.response?.data?.error || err.message)
                            }
                          }}
                          variant="default"
                          size="sm"
                        />
                      <IconButton icon={PencilIcon} type="button" label={t('admin.chapters.iconEdit')} onClick={() => handleEdit(chapter)} variant="default" size="sm" />
                      <IconButton icon={TrashIcon} type="button" label={t('admin.chapters.iconDelete')} onClick={() => handleDelete(chapter.documentId)} variant="danger" size="sm" />
                    </div>
                  </td>
                </tr>
              )})
            }
          </tbody>
        </table>
      </div>

      {isReordering && (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Saving new order...
        </div>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, allFiltered.length)} of {allFiltered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border disabled:opacity-30 hover:bg-gray-50 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                    safePage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  style={{
                    color: safePage === pageNum ? 'white' : 'var(--text-secondary)',
                    backgroundColor: safePage === pageNum ? '#2563eb' : 'transparent',
                  }}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border disabled:opacity-30 hover:bg-gray-50 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {previewChapter && (
        <ChapterPreviewModal
          chapter={previewChapter}
          language={i18n.language}
          onClose={() => setPreviewChapter(null)}
        />
      )}
    </div>
  )
}
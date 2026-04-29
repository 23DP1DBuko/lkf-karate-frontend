import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../api/strapi'
import MediaUpload from '../../components/MediaUpload'
import RichTextEditor from '../../components/RichTextEditor'
import IconButton from '../../components/IconButton'
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import { SkeletonTable } from '../../components/Skeleton'
import ChapterPreviewModal from '../../components/ChapterPreviewModal'
import BlockEditor from '../../components/BlockEditor'

export default function AdminChapters() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingChapter, setEditingChapter] = useState(null)
  const [filterCourse, setFilterCourse] = useState('all')
  const [previewChapter, setPreviewChapter] = useState(null)
  const [form, setForm] = useState({
    title: '', content: '', blocks: [], videoUrl: '', course: '', media: null
  })
  const [editingId, setEditingId] = useState(null)
  
  const emptyForm = {
    title: '',
    content: '',  // keep for backward compat
    blocks: [],   // new block-based content
    videoUrl: '',
    course: '',
    media: null,
  }

  const { data: chapters, isLoading } = useQuery({
    queryKey: ['admin-chapters'],
    queryFn: () => api.get('/chapters?populate[0]=course&populate[1]=media&populate[2]=questions&sort=order:asc&pagination[limit]=200').then(r => r.data.data)
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=title:asc').then(r => r.data.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/chapters', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-chapters'])
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data }) => api.put(`/chapters/${documentId}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-chapters'])
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/chapters/${documentId}`),
    onSuccess: async (_, deletedDocumentId) => {
      await queryClient.invalidateQueries(['admin-chapters'])
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
      queryClient.invalidateQueries(['admin-chapters'])
    }
  })

  const resetForm = () => {
    setForm(emptyForm)  // Now uses it
    setEditingId(null)
    setShowForm(false)
  }

  
  const handleEdit = (chapter) => {
    setForm({
      title: chapter.title || '',
      content: chapter.content || '',
      blocks: chapter.blocks || [],
      videoUrl: chapter.videoUrl || '',
      course: chapter.course?.documentId || '',
      media: chapter.media || null,
    })
    setEditingId(chapter.documentId)
    setEditingChapter(chapter)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

const handleSubmit = (e) => {
  e.preventDefault()

  // Auto-calculate order
  let order
  if (editingId) {
    // Keep existing order when editing
    const existing = chapters?.find(c => c.documentId === editingId)
    order = existing?.order || 1
  } else {
    // New chapter: max order in this course + 1
    const courseChapters = chapters?.filter(c => c.course?.documentId === form.course) || []
    order = courseChapters.length > 0
      ? Math.max(...courseChapters.map(c => c.order || 0)) + 1
      : 1
  }

  // Extract question relations from bank_question blocks
  const bankQuestionIds = (form.blocks || [])
    .filter(b => b.type === 'bank_question' && b.questionId)
    .map(b => b.questionId)

  const data = {
    title: form.title,
    content: form.content,
    order,
    videoUrl: form.videoUrl,
    course: form.course,
    media: form.media ? form.media.id : null,
    blocks: form.blocks || [],
    questions: bankQuestionIds,
  }
  if (editingId) {
    updateMutation.mutate({ documentId: editingId, data })
  } else {
    createMutation.mutate(data)
  }
}

  const handleDelete = (documentId) => {
    if (window.confirm('Delete this chapter?')) {
      deleteMutation.mutate(documentId)
    }
  }

  const filtered = chapters?.filter(q =>
    filterCourse === 'all' || q.course?.documentId === filterCourse
  )

  if (isLoading) return <SkeletonTable rows={5} cols={4} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Manage Chapters</h1>
          <p className="text-gray-500">{chapters?.length} chapters total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Chapter
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Chapter' : 'Create New Chapter'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Course</label>
              <select
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.course}
                onChange={e => setForm({ ...form, course: e.target.value })}
                required
              >
                <option value="">Select a course</option>
                {courses?.map(course => (
                  <option key={course.id} value={course.documentId}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Content Blocks
              </label>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Add text, videos, images in any order. Students see them in this order.
              </p>
              <BlockEditor
                blocks={form.blocks}
                onChange={blocks => setForm({ ...form, blocks })}
                courseId={form.course}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Video URL (YouTube)</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.videoUrl}
                  onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <MediaUpload
                label="Chapter Media (images/videos)"
                multiple={false}
                current={form.media}
                onUpload={(file) => setForm({ ...form, media: file })}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingId ? 'Update Chapter' : 'Create Chapter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
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
          onChange={e => setFilterCourse(e.target.value)}
        >
          <option value="all">All Courses</option>
          {courses?.map(course => (
            <option key={course.id} value={course.documentId}>{course.title}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Title</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Course</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>#</th>
              <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered?.map(chapter => (
              <tr key={chapter.id} className="border-b hover:opacity-80 transition" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{chapter.title}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{chapter.course?.title || '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{chapter.order}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={EyeIcon} type="button" label="Preview chapter" onClick={() => setPreviewChapter(chapter)} variant="default" size="sm" />
                    <IconButton icon={PencilIcon} type="button" label="Edit chapter" onClick={() => handleEdit(chapter)} variant="default" size="sm" />
                    <IconButton icon={TrashIcon} type="button" label="Delete chapter" onClick={() => handleDelete(chapter.documentId)} variant="danger" size="sm" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {previewChapter && (
        <ChapterPreviewModal
          chapter={previewChapter}
          onClose={() => setPreviewChapter(null)}
        />
      )}
    </div>
  )
}
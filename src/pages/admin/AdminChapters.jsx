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
    title: '', content: '', blocks: [], order: 1, videoUrl: '', course: '', media: null
  })
  const [editingId, setEditingId] = useState(null)
  
  const emptyForm = {
    title: '',
    content: '',  // keep for backward compat
    blocks: [],   // new block-based content
    order: 1,
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
    onSuccess: () => queryClient.invalidateQueries(['admin-chapters'])
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
      order: chapter.order || 1,
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
  const data = {
    title: form.title,
    content: form.content,
    order: Number(form.order),
    videoUrl: form.videoUrl,
    course: form.course,
    media: form.media ? form.media.id : null,
    blocks: form.blocks || [],
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
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Order</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.order}
                  onChange={e => setForm({ ...form, order: e.target.value })}
                  min={1}
                />
              </div>
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
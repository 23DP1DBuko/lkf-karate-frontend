import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../api/strapi'
import MediaUpload from '../../components/MediaUpload'
import RichTextEditor from '../../components/RichTextEditor'
import { mediaUrl } from '../../api/media'
import IconButton from '../../components/IconButton'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { SkeletonTable } from '../../components/Skeleton'

export default function AdminChapters() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingChapter, setEditingChapter] = useState(null)
  const [filterCourse, setFilterCourse] = useState('all')
  const [form, setForm] = useState({
    title: '', content: '', order: 1, videoUrl: '', course: '', media: null
  })
  
  const { data: chapters, isLoading } = useQuery({
    queryKey: ['admin-chapters'],
    queryFn: () => api.get('/chapters?populate[0]=course&populate[1]=media&sort=course.title:asc').then(r => r.data.data)
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
    setForm({ title: '', content: '', order: 1, videoUrl: '', course: '' })
    setShowForm(false)
    setEditingChapter(null)
  }

  const handleEdit = (chapter) => {
    setEditingChapter(chapter)
    setForm({
      title: chapter.title,
      content: chapter.content?.[0]?.children?.[0]?.text || '',
      order: chapter.order,
      videoUrl: chapter.videoUrl || '',
      course: chapter.course?.documentId || '',
      media: chapter.media || null,
    })
    setShowForm(true)
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
    }
    if (editingChapter) {
      updateMutation.mutate({ documentId: editingChapter.documentId, data })
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
            {editingChapter ? 'Edit Chapter' : 'Create New Chapter'}
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
              <label className="block text-sm font-medium mb-1">Content</label>
              <RichTextEditor
                label="Content"
                value={form.content}
                onChange={(val) => setForm({ ...form, content: val })}
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
                {editingChapter ? 'Update Chapter' : 'Create Chapter'}
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
            {chapters?.map(chapter => (
              <tr key={chapter.id} className="border-b hover:opacity-80 transition" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{chapter.title}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{chapter.course?.title || '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{chapter.order}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={PencilIcon} label="Edit chapter" onClick={() => handleEdit(chapter)} variant="default" size="sm" />
                    <IconButton icon={TrashIcon} label="Delete chapter" onClick={() => handleDelete(chapter.documentId)} variant="danger" size="sm" />
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
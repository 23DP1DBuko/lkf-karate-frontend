import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import api from '../../api/strapi'
import IconButton from '../../components/IconButton'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

const categoryLabels = {
  kata: 'Kata',
  kumite: 'Kumite',
  secretary: 'Secretary',
  seminar: 'Seminar',
}

export default function AdminCourses() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', category: 'kata', published: false, slug: ''
  })

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => api.get('/courses?sort=title:asc').then(r => r.data.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/courses', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-courses'])
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data }) => api.put(`/courses/${documentId}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-courses'])
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/courses/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries(['admin-courses'])
  })

  const resetForm = () => {
    setForm({ title: '', description: '', category: 'kata', published: false })
    setShowForm(false)
    setEditingCourse(null)
  }

  const handleEdit = (course) => {
    setEditingCourse(course)
    setForm({
      title: course.title,
      description: course.description,
      category: course.category,
      published: course.published,
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const slug = form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const dataWithSlug = { ...form, slug }
    if (editingCourse) {
      updateMutation.mutate({ documentId: editingCourse.documentId, data: dataWithSlug })
    } else {
      createMutation.mutate(dataWithSlug)
    }
  }

  const handleDelete = (documentId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      deleteMutation.mutate(documentId)
    }
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Manage Courses</h1>
          <p className="text-gray-500">{courses?.length} courses total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Course
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingCourse ? 'Edit Course' : 'Create New Course'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
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
                    checked={form.published}
                    onChange={e => setForm({ ...form, published: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium">Published</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingCourse ? 'Update Course' : 'Create Course'}
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

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {courses?.map(course => (
          <div key={course.id} className="rounded-xl p-4 shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{course.title}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{categoryLabels[course.category]}</p>
              </div>
              <div className="flex gap-1">
                <IconButton icon={PencilIcon} label="Edit" onClick={() => handleEdit(course)} variant="default" size="sm" />
                <IconButton icon={TrashIcon} label="Delete" onClick={() => handleDelete(course.documentId)} variant="danger" size="sm" />
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {course.published ? 'Published' : 'Draft'}
            </span>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Title</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
              <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses?.map(course => (
              <tr key={course.id} className="border-b hover:opacity-80 transition" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{course.title}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${course.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {course.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={PencilIcon} label="Edit course" onClick={() => handleEdit(course)} variant="default" size="sm" />
                    <IconButton icon={TrashIcon} label="Delete course" onClick={() => handleDelete(course.documentId)} variant="danger" size="sm" />
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
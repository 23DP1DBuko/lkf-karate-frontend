import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../api/strapi'

export default function AdminQuestions() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [filterCourse, setFilterCourse] = useState('all')
  const [form, setForm] = useState({
    text: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: '', course: ''
  })

  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin-questions'],
    queryFn: () => api.get('/questions?populate=course&sort=createdAt:desc').then(r => r.data.data)
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=title:asc').then(r => r.data.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/questions', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-questions'])
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data }) => api.put(`/questions/${documentId}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-questions'])
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/questions/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries(['admin-questions'])
  })

  const resetForm = () => {
    setForm({ text: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: '', course: '' })
    setShowForm(false)
    setEditingQuestion(null)
  }

  const handleEdit = (question) => {
    setEditingQuestion(question)
    setForm({
      text: question.text,
      type: question.type,
      options: question.type === 'multiple_choice'
        ? (question.options || ['', '', '', ''])
        : ['true', 'false'],
      correctAnswer: question.correctAnswer,
      course: question.course?.documentId || '',
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      text: form.text,
      type: form.type,
      options: form.type === 'yes_no' ? ['true', 'false'] : form.options.filter(o => o.trim()),
      correctAnswer: form.correctAnswer,
      course: form.course,
    }
    if (editingQuestion) {
      updateMutation.mutate({ documentId: editingQuestion.documentId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (documentId) => {
    if (window.confirm('Delete this question?')) {
      deleteMutation.mutate(documentId)
    }
  }

  const filtered = questions?.filter(q =>
    filterCourse === 'all' || q.course?.documentId === filterCourse
  )

  if (isLoading) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Manage Questions</h1>
          <p className="text-gray-500">{questions?.length} questions total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Question
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingQuestion ? 'Edit Question' : 'Create New Question'}
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
                  <option key={course.id} value={course.documentId}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Question Text</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={form.text}
                onChange={e => setForm({ ...form, text: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.type}
                onChange={e => setForm({
                  ...form,
                  type: e.target.value,
                  options: e.target.value === 'yes_no' ? ['true', 'false'] : ['', '', '', ''],
                  correctAnswer: ''
                })}
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="yes_no">Yes / No</option>
              </select>
            </div>

            {form.type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium mb-2">Options</label>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={opt}
                      onChange={e => {
                        const newOptions = [...form.options]
                        newOptions[i] = e.target.value
                        setForm({ ...form, options: newOptions })
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Correct Answer</label>
              {form.type === 'yes_no' ? (
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.correctAnswer}
                  onChange={e => setForm({ ...form, correctAnswer: e.target.value })}
                  required
                >
                  <option value="">Select correct answer</option>
                  <option value="true">Yes (true)</option>
                  <option value="false">No (false)</option>
                </select>
              ) : (
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.correctAnswer}
                  onChange={e => setForm({ ...form, correctAnswer: e.target.value })}
                  required
                >
                  <option value="">Select correct answer</option>
                  {form.options.filter(o => o.trim()).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingQuestion ? 'Update Question' : 'Create Question'}
              </button>
              <button type="button" onClick={resetForm} className="border px-6 py-2 rounded-lg hover:bg-gray-50">
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

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Question</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Type</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Course</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Correct Answer</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered?.map(question => (
              <tr key={question.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 max-w-xs">
                  <p className="truncate text-sm">{question.text}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {question.type === 'multiple_choice' ? 'Multiple Choice' : 'Yes / No'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{question.course?.title || '—'}</td>
                <td className="px-6 py-4 text-sm text-green-600 font-medium">{question.correctAnswer}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(question)} className="text-blue-600 hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(question.documentId)} className="text-red-500 hover:underline text-sm">Delete</button>
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
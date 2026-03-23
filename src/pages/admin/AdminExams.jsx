import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../api/strapi'

export default function AdminExams() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  const [form, setForm] = useState({
    title: '', duration: 30, questionCount: 10, passingScore: 70,
    openAt: '', closeAt: '', course: '', showResults: true,
    resultsReleased: false, selectedQuestions: []
  })

  const { data: exams, isLoading } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: () => api.get('/exams?populate=course&sort=createdAt:desc').then(r => r.data.data)
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=title:asc').then(r => r.data.data)
  })

  const { data: courseQuestions } = useQuery({
    queryKey: ['course-questions', form.course],
    queryFn: () => api.get(`/questions?filters[course][documentId][$eq]=${form.course}&populate[0]=media&sort=createdAt:asc`).then(r => r.data.data),
    enabled: !!form.course
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/exams', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-exams'])
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data }) => api.put(`/exams/${documentId}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-exams'])
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/exams/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries(['admin-exams'])
  })

  const resetForm = () => {
    setForm({
      title: '', duration: 30, questionCount: 10, passingScore: 70,
      openAt: '', closeAt: '', course: '', showResults: true,
      resultsReleased: false, selectedQuestions: []
    })
    setShowForm(false)
    setEditingExam(null)
  }

  const handleEdit = (exam) => {
    setEditingExam(exam)
    setForm({
      title: exam.title,
      duration: exam.duration,
      questionCount: exam.questionCount,
      passingScore: exam.passingScore,
      openAt: exam.openAt ? exam.openAt.slice(0, 16) : '',
      closeAt: exam.closeAt ? exam.closeAt.slice(0, 16) : '',
      course: exam.course?.documentId || '',
      showResults: exam.showResults ?? true,
      resultsReleased: exam.resultsReleased ?? false,
      selectedQuestions: exam.questions?.map(q => q.documentId) || []
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      title: form.title,
      duration: Number(form.duration),
      questionCount: form.selectedQuestions.length > 0
        ? form.selectedQuestions.length
        : Number(form.questionCount),
      passingScore: Number(form.passingScore),
      openAt: form.openAt || null,
      closeAt: form.closeAt || null,
      course: form.course,
      showResults: form.showResults,
      resultsReleased: form.resultsReleased,
      questions: form.selectedQuestions,
    }
    if (editingExam) {
      updateMutation.mutate({ documentId: editingExam.documentId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (documentId) => {
    if (window.confirm('Delete this exam?')) {
      deleteMutation.mutate(documentId)
    }
  }

  const toggleQuestion = (documentId) => {
    setForm(prev => ({
      ...prev,
      selectedQuestions: prev.selectedQuestions.includes(documentId)
        ? prev.selectedQuestions.filter(id => id !== documentId)
        : [...prev.selectedQuestions, documentId]
    }))
  }

  const selectAll = () => {
    setForm(prev => ({
      ...prev,
      selectedQuestions: courseQuestions?.map(q => q.documentId) || []
    }))
  }

  const deselectAll = () => {
    setForm(prev => ({ ...prev, selectedQuestions: [] }))
  }

  const getExamStatus = (exam) => {
    const now = new Date()
    if (exam.openAt && new Date(exam.openAt) > now) return { label: 'Scheduled', color: 'bg-yellow-100 text-yellow-700' }
    if (exam.closeAt && new Date(exam.closeAt) < now) return { label: 'Closed', color: 'bg-gray-100 text-gray-500' }
    return { label: 'Open', color: 'bg-green-100 text-green-700' }
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Manage Exams</h1>
          <p className="text-gray-500">{exams?.length} exams total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Exam
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingExam ? 'Edit Exam' : 'Create New Exam'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Course</label>
              <select
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.course}
                onChange={e => setForm({ ...form, course: e.target.value, selectedQuestions: [] })}
                required
              >
                <option value="">Select a course</option>
                {courses?.map(course => (
                  <option key={course.id} value={course.documentId}>{course.title}</option>
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                  min={1} required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Passing Score (%)</label>
                <input
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
                  <span className="text-sm font-medium">Show results</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Open At (optional)</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.openAt}
                  onChange={e => setForm({ ...form, openAt: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Close At (optional)</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.closeAt}
                  onChange={e => setForm({ ...form, closeAt: e.target.value })}
                />
              </div>
            </div>

            {/* Question selector */}
            {form.course && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    Select Questions
                    <span className="ml-2 text-blue-600 font-bold">
                      ({form.selectedQuestions.length} selected)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>

                {!courseQuestions?.length ? (
                  <p className="text-sm text-gray-400 border rounded-lg p-4">
                    No questions found for this course. Add questions first.
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
                              {question.text}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700'
                                : question.type === 'yes_no' ? 'bg-purple-100 text-purple-700'
                                : 'bg-orange-100 text-orange-700'
                              }`}>
                                {question.type === 'multiple_choice' ? 'Multiple Choice'
                                : question.type === 'yes_no' ? 'Yes/No'
                                : 'Open Text'}
                              </span>
                              {question.media?.length > 0 && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  📎 Media
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

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingExam ? 'Update Exam' : 'Create Exam'}
              </button>
              <button type="button" onClick={resetForm} className="border px-6 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Title</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Course</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Duration</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Questions</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Pass %</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {exams?.map(exam => {
              const status = getExamStatus(exam)
              return (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{exam.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exam.course?.title || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exam.duration} min</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exam.questionCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exam.passingScore}%</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(exam)} className="text-blue-600 hover:underline text-sm">Edit</button>
                      <button onClick={() => handleDelete(exam.documentId)} className="text-red-500 hover:underline text-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
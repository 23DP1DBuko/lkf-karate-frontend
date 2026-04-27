import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../api/strapi'
import MediaUpload from '../../components/MediaUpload'
import IconButton from '../../components/IconButton'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { SkeletonTable } from '../../components/Skeleton'

async function fetchAllQuestions(params = {}) {
  let page = 1
  let all = []

  while (true) {
    const res = await api.get('/questions', {
      params: {
        ...params,
        'pagination[page]': page,
        'pagination[pageSize]': 100,
      },
    })

    const items = res.data.data || []
    all = [...all, ...items]

    const { pagination } = res.data.meta
    if (page >= pagination.pageCount) break
    page++
  }

  return all
}

export default function AdminQuestions() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [filterCourse, setFilterCourse] = useState('all')
  const [form, setForm] = useState({
    text: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: '', course: '', media: null, chapter: ''
  })
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin-questions'],
    queryFn: () =>
      fetchAllQuestions({
        'populate[0]': 'course',
        'populate[1]': 'media',
        'populate[2]': 'chapter',
        sort: 'createdAt:desc',
      }),
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => api.get('/courses?sort=title:asc').then(r => r.data.data)
  })
  const { data: chapters } = useQuery({
    queryKey: ['chapters-list', form.course],
    queryFn: () => api.get(`/chapters?filters[course][documentId][$eq]=${form.course}&sort=order:asc`).then(r => r.data.data),
    enabled: !!form.course
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
      queryClient.invalidateQueries(['admin-attempts'])
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
      correctAnswer: question.correctAnswer || '',
      course: question.course?.documentId || '',
      media: question.media || null,
      chapter: question.chapter?.documentId || '',
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      text: form.text,
      type: form.type,
      options: form.type === 'yes_no' ? ['true', 'false'] : form.type === 'open_text' ? [] : form.options.filter(o => o.trim()),
      correctAnswer: form.type === 'open_text' ? null : form.correctAnswer,
      course: form.course,
      media: form.media ? form.media.id : null,
      chapter: form.chapter || null,
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

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== 'DELETE ALL QUESTIONS') return
    setDeleting(true)
    
    try {
      // Fetch all question IDs for selected course
      let allIds = []
      let page = 1
      while (true) {
        const params = {
          'pagination[page]': page,
          'pagination[pageSize]': 100,
          'fields[0]': 'documentId',
        }
        if (filterCourse !== 'all') {
          params['filters[course][documentId][$eq]'] = filterCourse
        }
        const res = await api.get('/questions', { params })
        const items = res.data.data || []
        allIds = [...allIds, ...items.map(q => q.documentId)]
        if (page >= res.data.meta.pagination.pageCount) break
        page++
      }

      // Delete all one by one
      for (const docId of allIds) {
        await api.delete(`/questions/${docId}`)
      }

      queryClient.invalidateQueries(['admin-questions'])
      setDeleteModal(false)
      setDeleteConfirmText('')
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = questions?.filter(q =>
    filterCourse === 'all' || q.course?.documentId === filterCourse
  )

  if (isLoading) return <SkeletonTable rows={5} cols={4} />
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Manage Questions</h1>
          <p className="text-gray-500">{questions?.length} questions total</p>
        </div>
        <button
          onClick={() => setDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 text-sm flex items-center gap-2"
        >
          <TrashIcon className="w-4 h-4" />
          Delete All
        </button>
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
            <MediaUpload
              label="Question Media (optional image/video)"
              multiple={false}
              current={form.media}
              onUpload={(file) => setForm({ ...form, media: file })}
            />
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
                <option value="open_text">Open Text</option>
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

            {form.type !== 'open_text' && (
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
            )}

            {form.type === 'open_text' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  ⚠️ Open text questions require manual grading by the head judge after exam submission.
                </p>
              </div>
            )}

            {form.course && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Chapter (optional — for chapter quiz)
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                  value={form.chapter}
                  onChange={e => setForm({ ...form, chapter: e.target.value })}
                >
                  <option value="">No specific chapter (exam only)</option>
                  {chapters?.map(chapter => (
                    <option key={chapter.id} value={chapter.documentId}>
                      {chapter.order}. {chapter.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
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
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                    question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700'
                    : question.type === 'yes_no' ? 'bg-purple-100 text-purple-700'
                    : 'bg-orange-100 text-orange-700'
                  }`}>
                    {question.type === 'multiple_choice' ? 'MC' : question.type === 'yes_no' ? 'Y/N' : 'Text'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{question.course?.title || '—'}</td>
                <td className="px-6 py-4 text-sm text-green-600 font-medium">{question.correctAnswer}</td>
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    <IconButton
                      icon={PencilIcon}
                      label="Edit question"
                      onClick={() => handleEdit(question)}
                      variant="default"
                    />
                    <IconButton
                      icon={TrashIcon}
                      label="Delete course"
                      onClick={() => handleDelete(question.documentId)}
                      variant="danger"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete All Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl shadow-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-red-600">Delete All Questions</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {filterCourse === 'all' ? 'All courses' : courses?.find(c => c.documentId === filterCourse)?.title}
                </p>
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete <strong>all questions</strong> for the selected course. 
              This cannot be undone.
            </p>

            <div className="p-3 rounded-lg mb-4 bg-red-50 border border-red-200">
              <p className="text-xs text-red-700 font-medium">
                Type <code className="bg-red-100 px-1 rounded font-mono">DELETE ALL QUESTIONS</code> to confirm
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE ALL QUESTIONS"
              className="w-full border rounded-lg px-3 py-2.5 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModal(false); setDeleteConfirmText('') }}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== 'DELETE ALL QUESTIONS' || deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
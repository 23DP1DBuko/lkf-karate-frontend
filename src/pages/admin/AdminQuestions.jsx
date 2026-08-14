import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api, { getLocalizedField } from '../../api/strapi'
import MediaUpload from '../../components/MediaUpload'
import FileDropzone from '../../components/FileDropzone'
import IconButton from '../../components/IconButton'
import { mediaUrl } from '../../api/media'
import { PencilIcon, TrashIcon, ArrowUpTrayIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
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

// ─── Helpers for aka/ao video slots ──────────────────────────────────────────

function getYouTubeEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed${u.pathname}`
    const v = u.searchParams.get('v')
    return v ? `https://www.youtube.com/embed/${v}` : null
  } catch {
    return null
  }
}

// One video slot: YouTube URL input + local drag & drop upload.
// The stored value is a URL string — a YouTube link or a Strapi upload path.
function VideoSlot({ label, value, onChange, placeholder, tone, hint }) {
  const [uploading, setUploading] = useState(false)
  const embed = getYouTubeEmbedUrl(value)
  const isFile = value && !embed

  const handleUpload = async (files) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('files', files[0])
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const file = res.data?.[0]
      if (file?.url) onChange(file.url)
    } catch (err) {
      console.error('Video upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: tone, backgroundColor: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: tone }}>{label}</p>
        {hint && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
      </div>

      <input
        type="url"
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />

      {value && (
        <div className="relative rounded-lg overflow-hidden">
          {embed ? (
            <div className="w-full aspect-video overflow-hidden bg-black">
              <iframe
                className="w-full h-full"
                src={embed}
                title={`${label} preview`}
                allowFullScreen
              />
            </div>
          ) : isFile ? (
            <video controls preload="metadata" src={mediaUrl(value)} className="w-full max-h-44 bg-black" />
          ) : null}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-lg hover:bg-red-700 transition"
          >
            Remove
          </button>
        </div>
      )}

      <FileDropzone
        icon={
          uploading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUpTrayIcon className="w-6 h-6" />
          )
        }
        title={() => (uploading ? 'Uploading…' : 'Drag & drop a local video here')}
        disabled={uploading}
        accept="video/*"
        multiple={false}
        ariaLabel="Upload video"
        onFiles={handleUpload}
      />
    </div>
  )
}

export default function AdminQuestions() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState({
    text: '', textLv: '', textRu: '', textEn: '',
    type: 'multiple_choice', options: ['', '', '', ''],
    correctAnswer: '', correctAnswers: [],
    videoAkaUrl: '', videoAoUrl: '', videoMode: 'single',
    course: '', media: null, chapter: '',
    order: ''
  })
  const [akaDragFrom, setAkaDragFrom] = useState(null)
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
    queryFn: () => api.get('/courses?sort=titleLv:asc').then(r => r.data.data)
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
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/questions/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-questions'])
      resetForm()
    }
  })

  const emptyForm = {
    text: '', textLv: '', textRu: '', textEn: '',
    type: 'multiple_choice', options: ['', '', '', ''],
    correctAnswer: '', correctAnswers: [],
    videoAkaUrl: '', videoAoUrl: '', videoMode: 'single',
    course: '', media: null, chapter: '',
    order: ''
  }

  const resetForm = () => {
    setForm(emptyForm)
    setShowForm(false)
    setEditingQuestion(null)
  }

  const handleEdit = (question) => {
    setEditingQuestion(question)
    const options = question.type === 'yes_no'
      ? ['true', 'false']
      : question.optionsLv || question.options || ['', '', '', '']
    setForm({
      text: question.textLv || question.text || '',
      textLv: question.textLv || '',
      textRu: question.textRu || '',
      textEn: question.textEn || '',
      type: question.type,
      options,
      correctAnswer: question.correctAnswer || '',
      correctAnswers: Array.isArray(question.correctAnswers) ? question.correctAnswers : [],
      videoAkaUrl: question.videoAkaUrl || '',
      videoAoUrl: question.videoAoUrl || '',
      videoMode: question.videoAoUrl ? 'two' : 'single',
      course: question.course?.documentId || '',
      media: question.media || null,
      chapter: question.chapter?.documentId || '',
      order: question.order || '',
    })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const options = form.type === 'yes_no'
      ? ['true', 'false']
      : form.type === 'open_text'
        ? []
        : form.options.filter(o => o.trim())

    // aka_ao: single-video mode stores the video in videoAkaUrl; two-video
    // mode stores each video in its own slot.
    const akaUrl = form.videoMode === 'two' ? form.videoAkaUrl : (form.videoAkaUrl || form.videoAoUrl)
    const aoUrl = form.videoMode === 'two' ? form.videoAoUrl : ''

    const data = {
      textLv: form.textLv || form.text || '',
      textRu: form.textRu || '',
      textEn: form.textEn || '',
      type: form.type,
      optionsLv: options,
      optionsRu: options,
      optionsEn: options,
      correctAnswer: form.type === 'open_text' || form.type === 'multiple_choice'
        ? null
        : form.correctAnswer,
      correctAnswers: form.type === 'multiple_choice'
        ? (form.correctAnswers.length > 0 ? form.correctAnswers : null)
        : null,
      videoAkaUrl: form.type === 'aka_ao' ? akaUrl : null,
      videoAoUrl: form.type === 'aka_ao' ? aoUrl : null,
      course: form.course,
      media: form.media ? form.media.id : null,
      chapter: form.chapter || null,
      order: (() => {
        if (editingQuestion) return form.order ? Number(form.order) : null
        // Auto-calculate: max order in this course + 1
        const courseQuestions = questions?.filter(q => q.course?.documentId === form.course) || []
        return courseQuestions.length > 0
          ? Math.max(...courseQuestions.map(q => q.order || 0)) + 1
          : 1
      })(),
    }
    if (editingQuestion) {
      updateMutation.mutate({ documentId: editingQuestion.documentId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const swapAkaAo = (dropKey) => {
    if (!akaDragFrom || akaDragFrom === dropKey) return
    setForm(prev => ({
      ...prev,
      videoAkaUrl: dropKey === 'aka' ? prev.videoAoUrl : prev.videoAkaUrl,
      videoAoUrl: dropKey === 'aka' ? prev.videoAkaUrl : prev.videoAoUrl,
    }))
    setAkaDragFrom(null)
  }

  const handleDelete = (documentId) => {
    if (window.confirm(t('admin.questions.deleteConfirm') || 'Delete this question?')) {
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

  const filtered = questions?.filter(q => {
    if (filterCourse !== 'all' && q.course?.documentId !== filterCourse) return false
    if (filterType !== 'all' && q.type !== filterType) return false
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      const haystack = [q.text, q.textLv, q.textRu, q.textEn, q.optionsLv, q.optionsRu, q.optionsEn, q.correctAnswer]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })

  if (isLoading) return <SkeletonTable rows={5} cols={4} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('admin.questions.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('admin.questions.count', { filtered: filtered?.length || 0, total: questions?.length || 0 })}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDeleteModal(true)}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-1.5"
          >
            <TrashIcon className="w-4 h-4" />
            {t('admin.questions.deleteAll') || 'Delete All'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            {t('admin.questions.new')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl shadow p-5 sm:p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold mb-4">
            {editingQuestion ? t('admin.questions.edit') : t('admin.questions.create')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.questions.courseLabel')}</label>
              <select
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.course}
                onChange={e => setForm({ ...form, course: e.target.value })}
                required
              >
                <option value="">{t('admin.questions.selectCourse') || 'Select a course'}</option>
                {courses?.map(course => (
                  <option key={course.id} value={course.documentId}>{getLocalizedField(course, i18n.language, 'title')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.questions.textLabel')}</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={form.text}
                onChange={e => setForm({ ...form, text: e.target.value })}
                required
              />
            </div>
            {/* Translations */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {t('admin.questions.translations')}
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.questions.lvText')}</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2}
                  value={form.textLv}
                  onChange={e => setForm({ ...form, textLv: e.target.value })}
                  style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.questions.ruText')}</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2}
                  value={form.textRu}
                  onChange={e => setForm({ ...form, textRu: e.target.value })}
                  style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.questions.enText')}</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2}
                  value={form.textEn}
                  onChange={e => setForm({ ...form, textEn: e.target.value })}
                  style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Order */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('admin.questions.orderLabel')} <span style={{ color: 'var(--text-muted)' }}>{t('admin.questions.orderHint')}</span>
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={form.order}
                onChange={e => setForm({ ...form, order: e.target.value })}
                min={1}
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                disabled={!editingQuestion}
                placeholder={editingQuestion ? 'e.g. 42' : t('admin.questions.autoCalculated')}
              />
            </div>

            {form.type !== 'aka_ao' && (
              <MediaUpload
                label={t('admin.questions.mediaLabel')}
                multiple={false}
                current={form.media}
                onUpload={(file) => setForm({ ...form, media: file })}
              />
            )}

            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.questions.typeLabel')}</label>
              <select
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.type}
                onChange={e => setForm({
                  ...form,
                  type: e.target.value,
                  options: e.target.value === 'yes_no' ? ['true', 'false'] : ['', '', '', ''],
                  correctAnswer: '',
                  correctAnswers: [],
                })}
              >
                <option value="multiple_choice">{t('admin.questions.typeMultipleChoice') || 'Multiple Choice (select all correct)'}</option>
                <option value="single_choice">{t('admin.questions.typeSingleChoice') || 'Single Choice'}</option>
                <option value="yes_no">{t('admin.questions.typeYesNo') || 'Yes / No'}</option>
                <option value="open_text">{t('admin.questions.typeOpenText') || 'Open Text'}</option>
                <option value="aka_ao">{t('admin.questions.typeAkaAo') || 'Aka / Ao (video)'}</option>
              </select>
            </div>

            {/* Options for choice types */}
            {(form.type === 'multiple_choice' || form.type === 'single_choice') && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.questions.optionsLabel')}</label>
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

            {/* Correct answer per type */}
            {form.type === 'yes_no' && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.questions.correctAnswerLabel')}</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.correctAnswer}
                  onChange={e => setForm({ ...form, correctAnswer: e.target.value })}
                  required
                >
                  <option value="">{t('admin.questions.selectCorrect')}</option>
                  <option value="true">{t('admin.questions.yesTrue')}</option>
                  <option value="false">{t('admin.questions.noFalse')}</option>
                </select>
              </div>
            )}

            {form.type === 'single_choice' && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.questions.correctAnswerLabel')}</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.correctAnswer}
                  onChange={e => setForm({ ...form, correctAnswer: e.target.value })}
                  required
                >
                  <option value="">{t('admin.questions.selectCorrect')}</option>
                  {form.options.filter(o => o.trim()).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {form.type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.questions.correctAnswersLabel')}</label>
                <div className="space-y-1.5">
                  {form.options.filter(o => o.trim()).length === 0 && (
                    <p className="text-xs text-amber-600">Add options above first.</p>
                  )}
                  {form.options.filter(o => o.trim()).map((opt, i) => {
                    const on = form.correctAnswers.includes(opt)
                    return (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition"
                        style={{
                          borderColor: on ? '#2563eb' : 'var(--border)',
                          backgroundColor: on ? 'rgba(37,99,235,0.08)' : 'transparent',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={e => setForm({
                            ...form,
                            correctAnswers: e.target.checked
                              ? [...form.correctAnswers, opt]
                              : form.correctAnswers.filter(v => v !== opt),
                          })}
                          className="w-4 h-4 accent-blue-600"
                        />
                        {opt}
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {t('admin.questions.selectCorrectAnswers')}
                </p>
              </div>
            )}

            {form.type === 'aka_ao' && (
              <div>
                {/* Layout toggle: one centered video or two labeled videos */}
                <div className="flex gap-2 mb-3">
                  {[
                    { key: 'single', label: '1 video', desc: t('admin.questions.layoutSingleHint') || 'centered · AO left / AKA right' },
                    { key: 'two', label: '2 videos', desc: t('admin.questions.layoutTwoHint') || 'side-by-side, labeled' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm({ ...form, videoMode: opt.key })}
                      className={`flex-1 px-3 py-2 rounded-lg border text-left transition ${
                        form.videoMode === opt.key ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-blue-300'
                      }`}
                      style={{ borderColor: form.videoMode === opt.key ? '#2563eb' : 'var(--border)' }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {form.videoMode === 'two' ? (
                  /* Two labeled video cards — drag a card onto the other to swap AKA/AO */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'aka', label: t('admin.questions.akaVideoLabel') || 'AKA video', tone: '#dc2626' },
                      { key: 'ao', label: t('admin.questions.aoVideoLabel') || 'AO video', tone: '#2563eb' },
                    ].map(slot => {
                      const val = slot.key === 'aka' ? form.videoAkaUrl : form.videoAoUrl
                      return (
                        <div
                          key={slot.key}
                          draggable
                          onDragStart={(e) => { setAkaDragFrom(slot.key); e.dataTransfer.effectAllowed = 'move' }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                          onDrop={(e) => { e.preventDefault(); swapAkaAo(slot.key) }}
                          className={akaDragFrom && akaDragFrom !== slot.key ? 'cursor-grabbing' : 'cursor-grab'}
                        >
                          <VideoSlot
                            label={slot.label}
                            tone={slot.tone}
                            value={val}
                            placeholder={t('admin.questions.videoYoutubePlaceholder') || 'YouTube URL (optional)'}
                            hint={t('admin.questions.videoUploadHint') || 'or drag & drop a local video'}
                            onChange={(url) => setForm({ ...form, [slot.key === 'aka' ? 'videoAkaUrl' : 'videoAoUrl']: url })}
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Single video — stored in the AKA slot, rendered centered */
                  <VideoSlot
                    label={t('admin.questions.singleVideoLabel') || 'Video'}
                    tone="#6b7280"
                    value={form.videoAkaUrl}
                    placeholder={t('admin.questions.videoYoutubePlaceholder') || 'YouTube URL (optional)'}
                    hint={t('admin.questions.videoUploadHint') || 'or drag & drop a local video'}
                    onChange={(url) => setForm({ ...form, videoAkaUrl: url })}
                  />
                )}

                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  {t('admin.questions.videoSlotsHint')}
                </p>

                {/* Correct answer: AKA or AO */}
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">{t('admin.questions.correctAnswerLabel')}</label>
                  <div className="flex gap-2 max-w-xs">
                    {[
                      { val: 'aka', label: t('admin.questions.aka') || 'AKA', tone: '#dc2626' },
                      { val: 'ao', label: t('admin.questions.ao') || 'AO', tone: '#2563eb' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setForm({ ...form, correctAnswer: opt.val })}
                        className="flex-1 py-2 rounded-lg border-2 text-sm font-bold transition"
                        style={{
                          backgroundColor: form.correctAnswer === opt.val ? opt.tone : 'var(--bg-secondary)',
                          color: form.correctAnswer === opt.val ? 'white' : opt.tone,
                          borderColor: form.correctAnswer === opt.val ? opt.tone : 'var(--border)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {form.type === 'open_text' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  {t('admin.questions.openTextWarning')}
                </p>
              </div>
            )}

            {form.course && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('admin.questions.chapterLabel')}
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                  value={form.chapter}
                  onChange={e => setForm({ ...form, chapter: e.target.value })}
                >
                  <option value="">{t('admin.questions.noChapter')}</option>
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
                {editingQuestion ? t('admin.questions.updateBtn') : t('admin.questions.createBtn')}
              </button>
              <button type="button" onClick={resetForm} className="border px-6 py-2 rounded-lg hover:bg-gray-50">
                {t('admin.questions.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters: search + type + course */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('admin.questions.searchPlaceholder') || 'Search questions...'}
            aria-label={t('admin.questions.searchPlaceholder') || 'Search questions...'}
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
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          aria-label={t('admin.questions.typeLabel')}
        >
          <option value="all">{t('admin.questions.allTypes') || 'All types'}</option>
          <option value="multiple_choice">{t('admin.questions.typeFilterMultipleChoice') || 'Multiple Choice'}</option>
          <option value="single_choice">{t('admin.questions.typeFilterSingleChoice') || 'Single Choice'}</option>
          <option value="yes_no">{t('admin.questions.typeFilterYesNo') || 'Yes / No'}</option>
          <option value="open_text">{t('admin.questions.typeFilterOpenText') || 'Open Text'}</option>
          <option value="aka_ao">{t('admin.questions.typeFilterAkaAo') || 'Aka / Ao'}</option>
        </select>
        <select
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filterCourse}
          onChange={e => setFilterCourse(e.target.value)}
          aria-label={t('admin.questions.courseLabel')}
        >
          <option value="all">{t('admin.questions.allCourses')}</option>
          {courses?.map(course => (
            <option key={course.id} value={course.documentId}>{getLocalizedField(course, i18n.language, 'title')}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full min-w-[600px]">
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.questions.colQuestion')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.questions.colType')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.questions.colCourse')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.questions.colAnswer')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.questions.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.length === 0 && (
              <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t('admin.questions.noResults') || 'No questions match your filters.'}
                  </p>
                  {(searchQuery || filterType !== 'all' || filterCourse !== 'all') && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterCourse('all') }}
                      className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      {t('common.clearFilters') || 'Clear filters'}
                    </button>
                  )}
                </td>
              </tr>
            )}
            {filtered?.map(question => (
              <tr key={question.id} className="border-t transition hover:opacity-80"
                style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 max-w-xs">
                  <p className="truncate text-sm" style={{ color: 'var(--text-primary)' }}>{question.text || question.textLv}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
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
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{getLocalizedField(question.course, i18n.language, 'title') || '—'}</td>
                <td className="px-4 py-3 text-sm text-green-600 font-medium">
                  {question.type === 'multiple_choice' && Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
                    ? question.correctAnswers.join(', ')
                    : question.type === 'aka_ao'
                      ? (question.correctAnswer === 'aka' ? 'AKA' : question.correctAnswer === 'ao' ? 'AO' : '—')
                      : question.correctAnswer || '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={PencilIcon} label={t('admin.questions.iconEdit')} onClick={() => handleEdit(question)} variant="default" size="sm" />
                    <IconButton icon={TrashIcon} label={t('admin.questions.iconDelete')} onClick={() => handleDelete(question.documentId)} variant="danger" size="sm" />
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
                <h2 className="font-bold text-lg text-red-600">{t('admin.questions.deleteAllTitle')}</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {filterCourse === 'all' ? t('admin.questions.allCourses') : getLocalizedField(courses?.find(c => c.documentId === filterCourse), i18n.language, 'title')}
                </p>
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {t('admin.questions.deleteAllWarning')}
            </p>

            <div className="p-3 rounded-lg mb-4 bg-red-50 border border-red-200">
              <p className="text-xs text-red-700 font-medium">
                {t('admin.questions.deleteAllConfirm')}
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={t('admin.questions.deleteAllConfirmPlaceholder') || 'DELETE ALL QUESTIONS'}
              className="w-full border rounded-lg px-3 py-2.5 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModal(false); setDeleteConfirmText('') }}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                {t('admin.questions.cancel')}
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== 'DELETE ALL QUESTIONS' || deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('admin.questions.deleting') || 'Deleting...'}
                  </>
                ) : t('admin.questions.deleteAllBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

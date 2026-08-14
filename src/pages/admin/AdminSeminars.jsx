import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import api, { fetchAllWithStatus } from '../../api/strapi'
import IconButton from '../../components/IconButton'
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'
import { SkeletonTable } from '../../components/Skeleton'
import ErrorState from '../../components/ErrorState'
import { useTranslation } from 'react-i18next'
import { SEMINAR_DEFAULTS, SEMINAR_TOPICS } from '../../utils/seminarDefaults'

const SEMINAR_TYPES = [
  'Practical Kata',
  'Practical Kumite',
  'Teoretical Kata',
  'Teoretical Kumite',
  'Secretary',
]

const typeColor = {
  'Practical Kata': 'text-blue-600',
  'Practical Kumite': 'text-indigo-600',
  'Teoretical Kata': 'text-purple-600',
  'Teoretical Kumite': 'text-fuchsia-600',
  'Secretary': 'text-orange-600',
}

const makeSlug = (title) =>
  (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Icon + text row used on the mobile card
const DetailRow = ({ icon: Icon, iconClass, children }) => (
  <div className="flex items-center gap-2.5">
    <Icon className={`w-4 h-4 flex-shrink-0 ${iconClass || 'text-slate-400'}`} aria-hidden="true" />
    <span className="text-sm min-w-0 truncate">{children}</span>
  </div>
)

// Strapi time fields may include seconds ("10:00:00.000") — inputs need HH:MM.
const fmtTime = (v) => (v || '').slice(0, 5)

const emptyForm = {
  title: '',
  isOnline: false,
  placeCountry: '', placeCity: '', placeAddress: '',
  meetingUrl: '',
  topics: [],
  certificateSignerName: '',
  certificateSignerTitle: '',
  presidentSignerName: SEMINAR_DEFAULTS.presidentSignerName,
  presidentSignerTitle: SEMINAR_DEFAULTS.presidentSignerTitle,
  date: '', time_from: '', time_to: '', type: 'Practical Kata', publishedAt: null,
}

// Join the address parts into one display string, skipping empty ones.
const formatPlace = (place = {}) =>
  [place.address, place.city, place.country].filter(Boolean).join(', ')

// Legacy rows stored `place: { lv, ru, en }` — map lv into address so
// nothing is lost when opening the form.
const placeFromItem = (item) => {
  const p = item.place || {}
  return {
    country: p.country || '',
    city: p.city || '',
    address: p.address || p.lv || '',
  }
}

export default function AdminSeminars() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const deleteModalRef = useRef(null)
  useFocusTrap(deleteModalRef)
  const [form, setForm] = useState(emptyForm)
  const [timeError, setTimeError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date_asc')

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-seminars'],
    queryFn: () => fetchAllWithStatus('/seminars'),
  })

  const createMutation = useMutation({
    // Strapi 5 publishes via the `status` query param — publishedAt in the
    // body is stripped by the document service.
    mutationFn: ({ data, status }) => api.post(`/seminars?status=${status}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seminars'] })
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data, status }) => api.put(`/seminars/${documentId}?status=${status}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seminars'] })
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/seminars/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-seminars'] })
  })

  const resetForm = () => {
    setForm(emptyForm)
    setTimeError('')
    setShowForm(false)
    setEditingItem(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    // Old seminars may miss the newer fields — fall back to safe values:
    // president signers default to the configured president; everything else
    // empty. The second signer stays empty and a warning is shown.
    setForm({
      title: item.title || '',
      isOnline: !!item.isOnline,
      ...placeFromItem(item),
      meetingUrl: item.meetingUrl || '',
      topics: Array.isArray(item.topics) ? item.topics : [],
      certificateSignerName: item.certificateSignerName || '',
      certificateSignerTitle: item.certificateSignerTitle || '',
      presidentSignerName: item.presidentSignerName || SEMINAR_DEFAULTS.presidentSignerName,
      presidentSignerTitle: item.presidentSignerTitle || SEMINAR_DEFAULTS.presidentSignerTitle,
      date: item.date || '',
      time_from: fmtTime(item.time_from),
      time_to: fmtTime(item.time_to),
      type: item.type || 'Practical Kata',
      publishedAt: item.publishedAt || null,
    })
    setTimeError('')
    setShowForm(true)
  }

  // Online seminars have no place (they run on Zoom) and get a prefilled title
  // — but only as a suggestion, never overwriting a typed title. The place
  // fields stay in the form state and are sent as null on save, so toggling
  // back to an offline seminar never loses typed place data.
  const handleIsOnlineChange = (e) => {
    const isOnline = e.target.checked
    setForm(prev => ({
      ...prev,
      isOnline,
      title: isOnline && !prev.title.trim() ? SEMINAR_DEFAULTS.onlineTitle : prev.title,
    }))
  }

  const toggleTopic = (key) => {
    setForm(prev => ({
      ...prev,
      topics: prev.topics.includes(key)
        ? prev.topics.filter(k => k !== key)
        : [...prev.topics, key],
    }))
  }

  // Slug is always derived from the title — admins never type it.
  const handleTitleChange = (title) => {
    setForm(prev => ({ ...prev, title }))
  }

  const validateTimes = (timeFrom, timeTo) => {
    if (timeFrom && timeTo && timeTo < timeFrom) {
      return t('admin.seminars.dateRangeError')
    }
    return ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const err = validateTimes(form.time_from, form.time_to)
    if (err) {
      setTimeError(err)
      return
    }
    setTimeError('')

    // Strapi v5 time fields require HH:mm:ss — HTML time inputs give HH:mm.
    const toStrapiTime = (v) => (v ? `${v}:00` : null)

    // Normalize before saving — never submit contradictory data:
    // online  → no physical place, optional meeting URL
    // offline → physical place, no meeting URL
    const meetingUrl = form.meetingUrl.trim()
    const data = {
      title: form.title,
      slug: makeSlug(form.title),
      place: form.isOnline
        ? null
        : {
            country: form.placeCountry.trim(),
            city: form.placeCity.trim(),
            address: form.placeAddress.trim(),
          },
      meetingUrl: form.isOnline ? (meetingUrl || null) : null,
      topics: form.topics,
      certificateSignerName: form.certificateSignerName.trim() || null,
      certificateSignerTitle: form.certificateSignerTitle.trim() || null,
      presidentSignerName: form.presidentSignerName.trim() || SEMINAR_DEFAULTS.presidentSignerName,
      presidentSignerTitle: form.presidentSignerTitle.trim() || SEMINAR_DEFAULTS.presidentSignerTitle,
      date: form.date || null,
      time_from: toStrapiTime(form.time_from),
      time_to: toStrapiTime(form.time_to),
      type: form.type,
      isOnline: form.isOnline,
    }

    const status = form.publishedAt ? 'published' : 'draft'

    if (editingItem) {
      updateMutation.mutate({ documentId: editingItem.documentId, data, status })
    } else {
      createMutation.mutate({ data, status })
    }
  }

  const handleDelete = (item) => setDeleteTarget(item)

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.documentId)
    setDeleteTarget(null)
  }

  const filtersActive = !!search || typeFilter !== 'all' || statusFilter !== 'all'

  const formatTime = (item) => {
    if (!item.time_from && !item.time_to) return null
    return `${fmtTime(item.time_from) || '--:--'} – ${fmtTime(item.time_to) || '--:--'}`
  }

  const filtered = useMemo(() => {
    let list = items || []
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(item => {
        const place = [item.place?.country, item.place?.city, item.place?.address, item.place?.lv]
          .filter(Boolean).join(' ').toLowerCase()
        return (item.title || '').toLowerCase().includes(q) || place.includes(q)
      })
    }
    if (typeFilter !== 'all') list = list.filter(item => item.type === typeFilter)
    if (statusFilter === 'published') list = list.filter(item => !!item.publishedAt)
    if (statusFilter === 'draft') list = list.filter(item => !item.publishedAt)
    const sorters = {
      date_asc: (a, b) => (a.date || '').localeCompare(b.date || ''),
      date_desc: (a, b) => (b.date || '').localeCompare(a.date || ''),
      title_az: (a, b) => (a.title || '').localeCompare(b.title || ''),
      title_za: (a, b) => (b.title || '').localeCompare(a.title || ''),
      newest: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
      oldest: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
    }
    return [...list].sort(sorters[sortBy] || sorters.date_asc)
  }, [items, search, typeFilter, statusFilter, sortBy])

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} title="Failed to load seminars" />
  }

  if (isLoading) return <SkeletonTable rows={5} cols={6} />

  const selectClass = 'w-full sm:w-44 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('admin.seminars.title')}</h1>
          <p className="text-gray-500">
            {filtersActive
              ? t('admin.seminars.count', { filtered: filtered.length, total: items?.length || 0 })
              : t('admin.seminars.total', { count: items?.length || 0 })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {t('admin.seminars.new')}
        </button>
      </div>

      {/* Search / filter / sort toolbar */}
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.seminars.searchPlaceholder')}
            aria-label={t('admin.seminars.searchPlaceholder')}
            className="w-full border rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('common.clearSearch') || 'Clear search'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:bg-slate-200 dark:hover:bg-slate-700/50"
              style={{ color: 'var(--text-muted)' }}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className={selectClass}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            aria-label={t('admin.seminars.typeLabel')}
          >
            <option value="all">{t('admin.seminars.allTypes')}</option>
            {SEMINAR_TYPES.map(type => (
              <option key={type} value={type}>{t(`admin.seminars.types.${type}`)}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label={t('admin.seminars.colStatus')}
          >
            <option value="all">{t('admin.seminars.allStatuses')}</option>
            <option value="published">{t('admin.seminars.published')}</option>
            <option value="draft">{t('admin.seminars.draft')}</option>
          </select>
          <select
            className={selectClass}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            aria-label={t('admin.seminars.sortLabel')}
          >
            <option value="date_asc">{t('admin.seminars.sortDateAsc')}</option>
            <option value="date_desc">{t('admin.seminars.sortDateDesc')}</option>
            <option value="title_az">{t('admin.seminars.sortTitleAZ')}</option>
            <option value="title_za">{t('admin.seminars.sortTitleZA')}</option>
            <option value="newest">{t('admin.seminars.sortNewest')}</option>
            <option value="oldest">{t('admin.seminars.sortOldest')}</option>
          </select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl shadow p-5 sm:p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold mb-4">
            {editingItem ? t('admin.seminars.edit') : t('admin.seminars.create')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="seminar-title">{t('admin.seminars.titleLabel')}</label>
                <input
                  id="seminar-title"
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  {t('admin.seminars.slugAutoHint')}
                </p>
              </div>
            </div>

            {/* Online toggle — online seminars run on Zoom, no place needed */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isOnline}
                  onChange={handleIsOnlineChange}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-medium">{t('admin.seminars.isOnlineLabel')}</span>
              </label>
              {form.isOnline && (
                <span className="text-xs inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <VideoCameraIcon className="w-4 h-4 text-blue-500" aria-hidden="true" />
                  {t('admin.seminars.onlineZoom')}
                </span>
              )}
            </div>

            {/* Meeting URL — online only, always optional (can be added later) */}
            {form.isOnline && (
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="seminar-meeting-url">
                  {t('admin.seminars.meetingUrlLabel')}
                </label>
                <input
                  id="seminar-meeting-url"
                  type="url"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.meetingUrl}
                  onChange={e => setForm({ ...form, meetingUrl: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                />
                <p className="mt-1 text-xs text-gray-400">
                  {t('admin.seminars.meetingUrlHint')}
                </p>
              </div>
            )}

            {!form.isOnline && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t('admin.seminars.placeLabel')}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="seminar-place-country">
                      {t('admin.seminars.countryLabel')}
                    </label>
                    <input
                      id="seminar-place-country"
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.placeCountry}
                      onChange={e => setForm({ ...form, placeCountry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="seminar-place-city">
                      {t('admin.seminars.cityLabel')}
                    </label>
                    <input
                      id="seminar-place-city"
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.placeCity}
                      onChange={e => setForm({ ...form, placeCity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="seminar-place-address">
                      {t('admin.seminars.addressLabel')}
                    </label>
                    <input
                      id="seminar-place-address"
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.placeAddress}
                      onChange={e => setForm({ ...form, placeAddress: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Topics — stable keys, labels come from i18n */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                {t('admin.seminars.topicsLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                {SEMINAR_TOPICS.map(key => {
                  const checked = form.topics.includes(key)
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition ${
                        checked
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTopic(key)}
                        className="accent-blue-600"
                      />
                      {t(`topics.${key}`)}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Certificate signers — president always signs, second signer configurable */}
            <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('admin.seminars.signersLabel')}
              </p>
              {!form.certificateSignerName.trim() && (
                <p className="text-xs font-medium text-amber-600">
                  {t('admin.seminars.signerMissingWarning')}
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="seminar-president-name">
                    {t('admin.seminars.presidentSignerNameLabel')}
                  </label>
                  <input
                    id="seminar-president-name"
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.presidentSignerName}
                    onChange={e => setForm({ ...form, presidentSignerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="seminar-president-title">
                    {t('admin.seminars.presidentSignerTitleLabel')}
                  </label>
                  <input
                    id="seminar-president-title"
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.presidentSignerTitle}
                    onChange={e => setForm({ ...form, presidentSignerTitle: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="seminar-signer-name">
                    {t('admin.seminars.certificateSignerNameLabel')}
                  </label>
                  <input
                    id="seminar-signer-name"
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.certificateSignerName}
                    onChange={e => setForm({ ...form, certificateSignerName: e.target.value })}
                    placeholder={t('admin.seminars.certificateSignerNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="seminar-signer-title">
                    {t('admin.seminars.certificateSignerTitleLabel')}
                  </label>
                  <input
                    id="seminar-signer-title"
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.certificateSignerTitle}
                    onChange={e => setForm({ ...form, certificateSignerTitle: e.target.value })}
                    placeholder={t('admin.seminars.certificateSignerTitlePlaceholder')}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="seminar-date">{t('admin.seminars.dateLabel')}</label>
                <input
                  id="seminar-date"
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="seminar-time-from">{t('admin.seminars.timeFromLabel')}</label>
                <input
                  id="seminar-time-from"
                  type="time"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.time_from}
                  onChange={e => {
                    const next = { ...form, time_from: e.target.value }
                    setForm(next)
                    setTimeError(validateTimes(next.time_from, next.time_to))
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="seminar-time-to">{t('admin.seminars.timeToLabel')}</label>
                <input
                  id="seminar-time-to"
                  type="time"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.time_to}
                  onChange={e => {
                    const next = { ...form, time_to: e.target.value }
                    setForm(next)
                    setTimeError(validateTimes(next.time_from, next.time_to))
                  }}
                />
              </div>
            </div>

            {timeError && (
              <p className="text-sm font-medium text-red-600">{timeError}</p>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1" htmlFor="seminar-type">{t('admin.seminars.typeLabel')}</label>
                <select
                  id="seminar-type"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  {SEMINAR_TYPES.map(type => (
                    <option key={type} value={type}>{t(`admin.seminars.types.${type}`)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.publishedAt}
                    onChange={e => setForm({ ...form, publishedAt: e.target.checked ? new Date().toISOString() : null })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium">{t('admin.seminars.published')}</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingItem ? t('admin.seminars.updateBtn') : t('admin.seminars.createBtn')}
              </button>
              <button type="button" onClick={resetForm} className="border px-6 py-2 rounded-lg hover:bg-gray-50">
                {t('admin.seminars.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {!filtered.length && (
        <div className="text-sm text-gray-400 border rounded-lg p-6 text-center">
          <p>{filtersActive ? t('admin.seminars.noResults') : t('admin.seminars.empty')}</p>
          {filtersActive && (
            <button
              type="button"
              onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all') }}
              className="mt-2 text-sm font-medium text-blue-600 hover:underline"
            >
              {t('common.clearFilters') || 'Clear filters'}
            </button>
          )}
        </div>
      )}

      {/* Mobile card view — icon + text rows, no chips */}
      <div className="md:hidden space-y-3">
        {filtered.map(item => {
          const place = formatPlace(item.place)
          const time = formatTime(item)
          return (
            <div key={item.id} className="rounded-xl p-4 shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <div className="flex gap-1 flex-shrink-0">
                  <IconButton icon={PencilIcon} label={t('admin.seminars.iconEdit')} onClick={() => handleEdit(item)} variant="default" size="sm" />
                  <IconButton icon={TrashIcon} label={t('admin.seminars.iconDelete')} onClick={() => handleDelete(item)} variant="danger" size="sm" />
                </div>
              </div>
              <div className="space-y-2" style={{ color: 'var(--text-muted)' }}>
                <DetailRow icon={CalendarDaysIcon}>{item.date || '—'}</DetailRow>
                {time && <DetailRow icon={ClockIcon}>{time}</DetailRow>}
                {item.isOnline ? (
                  <DetailRow icon={VideoCameraIcon} iconClass="text-blue-500">
                    {t('admin.seminars.onlineZoom')}
                  </DetailRow>
                ) : place ? (
                  <DetailRow icon={MapPinIcon}>{place}</DetailRow>
                ) : null}
                <DetailRow icon={AcademicCapIcon} iconClass={typeColor[item.type] || 'text-slate-400'}>
                  {t(`admin.seminars.types.${item.type}`, item.type)}
                </DetailRow>
                <DetailRow icon={item.publishedAt ? CheckCircleIcon : XCircleIcon} iconClass={item.publishedAt ? 'text-emerald-500' : 'text-slate-400'}>
                  {item.publishedAt ? t('admin.seminars.published') : t('admin.seminars.draft')}
                </DetailRow>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table — icons instead of chips */}
      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.seminars.colTitle')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.seminars.colDate')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.seminars.colTime')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.seminars.colPlace')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.seminars.colType')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.seminars.colStatus')}</th>
              <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.seminars.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(item => {
              const time = formatTime(item)
              return (
                <tr key={item.id} className="border-b hover:opacity-80 transition" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{item.title || '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDaysIcon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      {item.date || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <ClockIcon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      {time || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {item.isOnline ? (
                      <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
                        <VideoCameraIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        {t('admin.seminars.onlineZoom')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinIcon className="w-4 h-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="truncate max-w-[220px]">{formatPlace(item.place) || '—'}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1.5 font-medium ${typeColor[item.type] || 'text-gray-600'}`}>
                      <AcademicCapIcon className="w-4 h-4" aria-hidden="true" />
                      {t(`admin.seminars.types.${item.type}`, item.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1.5 font-medium ${item.publishedAt ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {item.publishedAt
                        ? <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
                        : <XCircleIcon className="w-4 h-4" aria-hidden="true" />}
                      {item.publishedAt ? t('admin.seminars.published') : t('admin.seminars.draft')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <IconButton icon={PencilIcon} label={t('admin.seminars.iconEdit')} onClick={() => handleEdit(item)} variant="default" size="sm" />
                      <IconButton icon={TrashIcon} label={t('admin.seminars.iconDelete')} onClick={() => handleDelete(item)} variant="danger" size="sm" />
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
          aria-labelledby="seminar-delete-title"
          onKeyDown={e => { if (e.key === 'Escape') setDeleteTarget(null) }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 id="seminar-delete-title" className="text-lg font-semibold text-slate-900">
              {t('admin.seminars.deleteConfirm')}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t('admin.seminars.deleteWarning', { title: deleteTarget.title })}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('admin.seminars.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {t('admin.seminars.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

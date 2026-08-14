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
  TrophyIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { SkeletonTable } from '../../components/Skeleton'
import ErrorState from '../../components/ErrorState'
import { useTranslation } from 'react-i18next'

const COMPETITION_RATINGS = ['International', 'EKF', 'LV']

const ratingColor = {
  International: 'text-blue-600',
  EKF: 'text-purple-600',
  LV: 'text-emerald-600',
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

const emptyForm = {
  title: '',
  placeCountry: '', placeCity: '', placeAddress: '',
  date_from: '', date_to: '', rating: 'International', publishedAt: null,
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

export default function AdminCompetitions() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const deleteModalRef = useRef(null)
  useFocusTrap(deleteModalRef)
  const [form, setForm] = useState(emptyForm)
  const [dateError, setDateError] = useState('')
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date_asc')

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-competitions'],
    queryFn: () => fetchAllWithStatus('/competitions'),
  })

  const createMutation = useMutation({
    // Strapi 5 publishes via the `status` query param — publishedAt in the
    // body is stripped by the document service.
    mutationFn: ({ data, status }) => api.post(`/competitions?status=${status}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-competitions'] })
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ documentId, data, status }) => api.put(`/competitions/${documentId}?status=${status}`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-competitions'] })
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/competitions/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-competitions'] })
  })

  const resetForm = () => {
    setForm(emptyForm)
    setDateError('')
    setShowForm(false)
    setEditingItem(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setForm({
      title: item.title || '',
      ...placeFromItem(item),
      date_from: item.date_from || '',
      date_to: item.date_to || '',
      rating: item.rating || 'International',
      publishedAt: item.publishedAt || null,
    })
    setDateError('')
    setShowForm(true)
  }

  // Slug is always derived from the title — admins never type it.
  const handleTitleChange = (title) => {
    setForm(prev => ({ ...prev, title }))
  }

  const validateDates = (dateFrom, dateTo) => {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      return t('admin.competitions.dateRangeError')
    }
    return ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const err = validateDates(form.date_from, form.date_to)
    if (err) {
      setDateError(err)
      return
    }
    setDateError('')

    const data = {
      title: form.title,
      slug: makeSlug(form.title),
      place: {
        country: form.placeCountry,
        city: form.placeCity,
        address: form.placeAddress,
      },
      date_from: form.date_from || null,
      date_to: form.date_to || null,
      rating: form.rating,
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

  const filtersActive = !!search || ratingFilter !== 'all' || statusFilter !== 'all'

  const formatDates = (item) => {
    if (!item.date_from) return '—'
    if (!item.date_to || item.date_to === item.date_from) return item.date_from
    return `${item.date_from} – ${item.date_to}`
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
    if (ratingFilter !== 'all') list = list.filter(item => item.rating === ratingFilter)
    if (statusFilter === 'published') list = list.filter(item => !!item.publishedAt)
    if (statusFilter === 'draft') list = list.filter(item => !item.publishedAt)
    const sorters = {
      date_asc: (a, b) => (a.date_from || '').localeCompare(b.date_from || ''),
      date_desc: (a, b) => (b.date_from || '').localeCompare(a.date_from || ''),
      title_az: (a, b) => (a.title || '').localeCompare(b.title || ''),
      title_za: (a, b) => (b.title || '').localeCompare(a.title || ''),
      newest: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
      oldest: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
    }
    return [...list].sort(sorters[sortBy] || sorters.date_asc)
  }, [items, search, ratingFilter, statusFilter, sortBy])

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} title="Failed to load competitions" />
  }

  if (isLoading) return <SkeletonTable rows={5} cols={6} />

  const selectClass = 'w-full sm:w-44 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('admin.competitions.title')}</h1>
          <p className="text-gray-500">
            {filtersActive
              ? t('admin.competitions.count', { filtered: filtered.length, total: items?.length || 0 })
              : t('admin.competitions.total', { count: items?.length || 0 })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {t('admin.competitions.new')}
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
            placeholder={t('admin.competitions.searchPlaceholder')}
            aria-label={t('admin.competitions.searchPlaceholder')}
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
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value)}
            aria-label={t('admin.competitions.ratingLabel')}
          >
            <option value="all">{t('admin.competitions.allRatings')}</option>
            {COMPETITION_RATINGS.map(rating => (
              <option key={rating} value={rating}>{t(`admin.competitions.ratings.${rating}`)}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label={t('admin.competitions.colStatus')}
          >
            <option value="all">{t('admin.competitions.allStatuses')}</option>
            <option value="published">{t('admin.competitions.published')}</option>
            <option value="draft">{t('admin.competitions.draft')}</option>
          </select>
          <select
            className={selectClass}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            aria-label={t('admin.competitions.sortLabel')}
          >
            <option value="date_asc">{t('admin.competitions.sortDateAsc')}</option>
            <option value="date_desc">{t('admin.competitions.sortDateDesc')}</option>
            <option value="title_az">{t('admin.competitions.sortTitleAZ')}</option>
            <option value="title_za">{t('admin.competitions.sortTitleZA')}</option>
            <option value="newest">{t('admin.competitions.sortNewest')}</option>
            <option value="oldest">{t('admin.competitions.sortOldest')}</option>
          </select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl shadow p-5 sm:p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold mb-4">
            {editingItem ? t('admin.competitions.edit') : t('admin.competitions.create')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="competition-title">{t('admin.competitions.titleLabel')}</label>
                <input
                  id="competition-title"
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  {t('admin.competitions.slugAutoHint')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('admin.competitions.placeLabel')}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="competition-place-country">
                    {t('admin.competitions.countryLabel')}
                  </label>
                  <input
                    id="competition-place-country"
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.placeCountry}
                    onChange={e => setForm({ ...form, placeCountry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="competition-place-city">
                    {t('admin.competitions.cityLabel')}
                  </label>
                  <input
                    id="competition-place-city"
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.placeCity}
                    onChange={e => setForm({ ...form, placeCity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="competition-place-address">
                    {t('admin.competitions.addressLabel')}
                  </label>
                  <input
                    id="competition-place-address"
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.placeAddress}
                    onChange={e => setForm({ ...form, placeAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="competition-date-from">{t('admin.competitions.dateFromLabel')}</label>
                <input
                  id="competition-date-from"
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.date_from}
                  onChange={e => {
                    const next = { ...form, date_from: e.target.value }
                    setForm(next)
                    setDateError(validateDates(next.date_from, next.date_to))
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="competition-date-to">{t('admin.competitions.dateToLabel')}</label>
                <input
                  id="competition-date-to"
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.date_to}
                  onChange={e => {
                    const next = { ...form, date_to: e.target.value }
                    setForm(next)
                    setDateError(validateDates(next.date_from, next.date_to))
                  }}
                />
              </div>
            </div>

            {dateError && (
              <p className="text-sm font-medium text-red-600">{dateError}</p>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1" htmlFor="competition-rating">{t('admin.competitions.ratingLabel')}</label>
                <select
                  id="competition-rating"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.rating}
                  onChange={e => setForm({ ...form, rating: e.target.value })}
                >
                  {COMPETITION_RATINGS.map(rating => (
                    <option key={rating} value={rating}>{t(`admin.competitions.ratings.${rating}`)}</option>
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
                  <span className="text-sm font-medium">{t('admin.competitions.published')}</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingItem ? t('admin.competitions.updateBtn') : t('admin.competitions.createBtn')}
              </button>
              <button type="button" onClick={resetForm} className="border px-6 py-2 rounded-lg hover:bg-gray-50">
                {t('admin.competitions.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {!filtered.length && (
        <div className="text-sm text-gray-400 border rounded-lg p-6 text-center">
          <p>{filtersActive ? t('admin.competitions.noResults') : t('admin.competitions.empty')}</p>
          {filtersActive && (
            <button
              type="button"
              onClick={() => { setSearch(''); setRatingFilter('all'); setStatusFilter('all') }}
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
          return (
            <div key={item.id} className="rounded-xl p-4 shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <div className="flex gap-1 flex-shrink-0">
                  <IconButton icon={PencilIcon} label={t('admin.competitions.iconEdit')} onClick={() => handleEdit(item)} variant="default" size="sm" />
                  <IconButton icon={TrashIcon} label={t('admin.competitions.iconDelete')} onClick={() => handleDelete(item)} variant="danger" size="sm" />
                </div>
              </div>
              <div className="space-y-2" style={{ color: 'var(--text-muted)' }}>
                <DetailRow icon={CalendarDaysIcon}>{formatDates(item)}</DetailRow>
                {place && <DetailRow icon={MapPinIcon}>{place}</DetailRow>}
                <DetailRow icon={TrophyIcon} iconClass={ratingColor[item.rating] || 'text-slate-400'}>
                  {t(`admin.competitions.ratings.${item.rating}`, item.rating)}
                </DetailRow>
                <DetailRow icon={item.publishedAt ? CheckCircleIcon : XCircleIcon} iconClass={item.publishedAt ? 'text-emerald-500' : 'text-slate-400'}>
                  {item.publishedAt ? t('admin.competitions.published') : t('admin.competitions.draft')}
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
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.competitions.colTitle')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.competitions.colDates')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.competitions.colPlace')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.competitions.colRating')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.competitions.colStatus')}</th>
              <th className="text-right px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('admin.competitions.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(item => (
              <tr key={item.id} className="border-b hover:opacity-80 transition" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{item.title || '—'}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDaysIcon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    {formatDates(item)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPinIcon className="w-4 h-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="truncate max-w-[220px]">{formatPlace(item.place) || '—'}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center gap-1.5 font-medium ${ratingColor[item.rating] || 'text-gray-600'}`}>
                    <TrophyIcon className="w-4 h-4" aria-hidden="true" />
                    {t(`admin.competitions.ratings.${item.rating}`, item.rating)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center gap-1.5 font-medium ${item.publishedAt ? 'text-emerald-600' : 'text-gray-500'}`}>                      {item.publishedAt
                        ? <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
                        : <XCircleIcon className="w-4 h-4" aria-hidden="true" />}
                      {item.publishedAt ? t('admin.competitions.published') : t('admin.competitions.draft')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={PencilIcon} label={t('admin.competitions.iconEdit')} onClick={() => handleEdit(item)} variant="default" size="sm" />
                    <IconButton icon={TrashIcon} label={t('admin.competitions.iconDelete')} onClick={() => handleDelete(item)} variant="danger" size="sm" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div
          ref={deleteModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="competition-delete-title"
          onKeyDown={e => { if (e.key === 'Escape') setDeleteTarget(null) }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 id="competition-delete-title" className="text-lg font-semibold text-slate-900">
              {t('admin.competitions.deleteConfirm')}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t('admin.competitions.deleteWarning', { title: deleteTarget.title })}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('admin.competitions.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {t('admin.competitions.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

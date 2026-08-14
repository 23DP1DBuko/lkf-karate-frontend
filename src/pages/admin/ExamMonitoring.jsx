import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { getLocalizedField } from '../../api/strapi'
import { useTranslation } from 'react-i18next'
import ErrorState from '../../components/ErrorState'
import useFocusTrap from '../../hooks/useFocusTrap'
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  EyeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

const BLUR_WARN_THRESHOLD = 5
const TIME_OUTSIDE_WARN_SECONDS = 60
const REFRESH_INTERVAL_MS = 15000

// mm:ss or hh:mm:ss
function formatDuration(totalSeconds) {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return '—'
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function SortHeader({ label, k, sortKey, sortDir, onSort, className = '' }) {
  return (
    <th
      className={`px-4 py-3 text-left text-sm font-medium cursor-pointer select-none hover:opacity-70 transition ${className}`}
      style={{ color: 'var(--text-muted)' }}
      onClick={() => onSort(k)}
      scope="col"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (
          <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  )
}

export default function ExamMonitoring() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { examDocumentId } = useParams()

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSuspicious, setFilterSuspicious] = useState(false)
  const [sortKey, setSortKey] = useState('startedAt')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const modalRef = useRef(null)
  useFocusTrap(modalRef)

  const fetchMonitoring = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/exam-attempts/monitoring/${examDocumentId}`)
      setData(res.data.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || t('admin.monitoring.loadError'))
    } finally {
      setLoading(false)
    }
  }, [examDocumentId, t])

  useEffect(() => {
    fetchMonitoring()
    const timer = setInterval(() => fetchMonitoring(false), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchMonitoring])

  const attempts = useMemo(() => data?.attempts || [], [data])

  const stats = useMemo(() => {
    const flagged = attempts.filter(
      (a) =>
        a.blurEventCount > BLUR_WARN_THRESHOLD ||
        a.totalTimeOutsideSeconds > TIME_OUTSIDE_WARN_SECONDS
    ).length
    return {
      total: attempts.length,
      inProgress: attempts.filter((a) => a.status === 'in_progress').length,
      submitted: attempts.filter((a) => a.status === 'submitted').length,
      flagged,
    }
  }, [attempts])

  const filtered = useMemo(() => {
    let list = attempts
    if (filterStatus !== 'all') list = list.filter((a) => a.status === filterStatus)
    if (filterSuspicious) {
      list = list.filter(
        (a) =>
          a.blurEventCount > BLUR_WARN_THRESHOLD ||
          a.totalTimeOutsideSeconds > TIME_OUTSIDE_WARN_SECONDS
      )
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      let va, vb
      if (sortKey === 'blur') {
        va = a.blurEventCount || 0
        vb = b.blurEventCount || 0
      } else if (sortKey === 'timeOutside') {
        va = a.totalTimeOutsideSeconds || 0
        vb = b.totalTimeOutsideSeconds || 0
      } else if (sortKey === 'status') {
        va = a.status || ''
        vb = b.status || ''
      } else if (sortKey === 'suspicion') {
        va = a.suspicionScore || 0
        vb = b.suspicionScore || 0
      } else {
        va = a.startedAt ? new Date(a.startedAt).getTime() : 0
        vb = b.startedAt ? new Date(b.startedAt).getTime() : 0
      }
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [attempts, filterStatus, filterSuspicious, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      in_progress: { label: t('admin.monitoring.statusInProgress'), cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
      submitted: { label: t('admin.monitoring.statusSubmitted'), cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
      expired: { label: t('admin.monitoring.statusExpired'), cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
      abandoned: { label: t('admin.monitoring.statusAbandoned'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    }
    return map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  }

  const isSuspicious = (a) =>
    (a.blurEventCount || 0) > BLUR_WARN_THRESHOLD ||
    (a.totalTimeOutsideSeconds || 0) > TIME_OUTSIDE_WARN_SECONDS

  if (error && !data) {
    return (
      <ErrorState
        error={error}
        onRetry={() => fetchMonitoring()}
        title={t('admin.monitoring.loadError')}
      />
    )
  }

  return (
    <div className="max-w-6xl">
      <button
        onClick={() => navigate('/admin/exams')}
        className="text-blue-600 hover:underline text-sm mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {t('admin.monitoring.backToExams')}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">
            {t('admin.monitoring.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.monitoring.subtitle')}
            {data?.exam?.title ? (
              <span className="font-semibold"> — {getLocalizedField(data.exam, i18n.language, 'title') || data.exam.title}</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {lastUpdated
              ? `${t('admin.monitoring.lastUpdated')}: ${lastUpdated.toLocaleTimeString()}`
              : t('admin.monitoring.refreshing')}
          </span>
          <button
            onClick={() => fetchMonitoring()}
            className="inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm font-medium transition hover:border-blue-400 hover:text-blue-600"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.monitoring.refresh')}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('admin.monitoring.summaryTotal')}</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('admin.monitoring.summaryInProgress')}</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('admin.monitoring.summarySubmitted')}</div>
        </div>
        <div
          className={`rounded-xl p-4 border ${stats.flagged > 0 ? 'bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800' : ''}`}
          style={{ borderColor: stats.flagged > 0 ? undefined : 'var(--border)', backgroundColor: stats.flagged > 0 ? undefined : 'var(--bg-card)' }}
        >
          <div className={`text-2xl font-bold ${stats.flagged > 0 ? 'text-red-600' : ''}`} style={stats.flagged > 0 ? undefined : { color: 'var(--text-primary)' }}>{stats.flagged}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('admin.monitoring.summaryFlagged')}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2.5">
        <select
          className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label={t('admin.monitoring.filterStatus')}
        >
          <option value="all">{t('admin.monitoring.allStatuses')}</option>
          <option value="in_progress">{t('admin.monitoring.statusInProgress')}</option>
          <option value="submitted">{t('admin.monitoring.statusSubmitted')}</option>
          <option value="expired">{t('admin.monitoring.statusExpired')}</option>
          <option value="abandoned">{t('admin.monitoring.statusAbandoned')}</option>
        </select>
        <label
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition hover:border-red-300"
          style={{ borderColor: filterSuspicious ? '#f87171' : 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <input
            type="checkbox"
            checked={filterSuspicious}
            onChange={(e) => setFilterSuspicious(e.target.checked)}
            className="w-4 h-4 accent-red-500"
          />
          {t('admin.monitoring.suspiciousOnly')}
        </label>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--border)' }} />
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <div className="rounded-2xl shadow p-10 text-center border" style={{ backgroundColor: 'var(--bg-card)' }}>
          <EyeIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('admin.monitoring.noAttempts')}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('admin.monitoring.noAttemptsDesc')}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl shadow p-10 text-center border" style={{ backgroundColor: 'var(--bg-card)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.monitoring.noMatch')}
          </p>
        </div>
      ) : (
        <div className="rounded-xl shadow overflow-hidden overflow-x-auto border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <table className="w-full min-w-[900px] text-sm">
            <thead
              className="border-b"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <tr>
                <SortHeader label={t('admin.monitoring.colStudent')} k="startedAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label={t('admin.monitoring.colStatus')} k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }} scope="col">
                  {t('admin.monitoring.colQuestion')}
                </th>
                <SortHeader label={t('admin.monitoring.colStarted')} k="startedAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }} scope="col">
                  {t('admin.monitoring.colLastActivity')}
                </th>
                <SortHeader label={t('admin.monitoring.colBlur')} k="blur" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label={t('admin.monitoring.colTimeOutside')} k="timeOutside" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }} scope="col">
                  {t('admin.monitoring.colLastPage')}
                </th>
                <SortHeader label={t('admin.monitoring.colSuspicion')} k="suspicion" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: 'var(--text-muted)' }} scope="col">
                  {t('admin.monitoring.colActions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map((a) => {
                const status = getStatusBadge(a.status)
                const susp = isSuspicious(a)
                return (
                  <tr
                    key={a.id}
                    className={`transition hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                      susp ? 'bg-red-50/60 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() || a.user.username || '—' : '—'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {a.user?.email || ''} {a.user ? `· ID ${a.user.id}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {a.answeredCount} / {a.questionCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {formatDateTime(a.startedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {formatDateTime(a.lastActivityAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold tabular-nums ${
                          a.blurEventCount > BLUR_WARN_THRESHOLD ? 'text-red-600' : ''
                        }`}
                        style={a.blurEventCount > BLUR_WARN_THRESHOLD ? undefined : { color: 'var(--text-secondary)' }}
                      >
                        {a.blurEventCount}
                        {a.blurEventCount > BLUR_WARN_THRESHOLD && (
                          <ExclamationTriangleIcon className="w-3.5 h-3.5 inline ml-1 text-red-500" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold tabular-nums ${
                          a.totalTimeOutsideSeconds > TIME_OUTSIDE_WARN_SECONDS ? 'text-red-600' : ''
                        }`}
                        style={a.totalTimeOutsideSeconds > TIME_OUTSIDE_WARN_SECONDS ? undefined : { color: 'var(--text-secondary)' }}
                      >
                        {formatDuration(a.totalTimeOutsideSeconds)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          a.lastKnownPage && a.lastKnownPage !== 'exam'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                            : ''
                        }`}
                        style={{ color: a.lastKnownPage && a.lastKnownPage !== 'exam' ? undefined : 'var(--text-secondary)' }}
                      >
                        {a.lastKnownPage || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                          a.suspicionScore >= 40 ? 'text-red-600' : a.suspicionScore >= 15 ? 'text-amber-600' : ''
                        }`}
                        style={a.suspicionScore >= 15 ? undefined : { color: 'var(--text-muted)' }}
                      >
                        {a.suspicionScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedAttempt(a)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {t('admin.monitoring.viewDetails')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Attempt details modal ── */}
      {selectedAttempt && (
        <AttemptDetailsModal
          attempt={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
          modalRef={modalRef}
        />
      )}
    </div>
  )
}

function AttemptDetailsModal({ attempt, onClose, modalRef }) {
  const { t } = useTranslation()

  const isSusp = (a) =>
    (a.blurEventCount || 0) > BLUR_WARN_THRESHOLD ||
    (a.totalTimeOutsideSeconds || 0) > TIME_OUTSIDE_WARN_SECONDS

  const statusLabels = {
    in_progress: t('admin.monitoring.statusInProgress'),
    submitted: t('admin.monitoring.statusSubmitted'),
    expired: t('admin.monitoring.statusExpired'),
    abandoned: t('admin.monitoring.statusAbandoned'),
  }

  const rows = [
    { label: t('admin.monitoring.detailStudent'), value: attempt.user ? `${attempt.user.firstName || ''} ${attempt.user.lastName || ''}`.trim() || attempt.user.username : '—' },
    { label: t('admin.monitoring.detailEmail'), value: attempt.user?.email || '—' },
    { label: t('admin.monitoring.detailUserId'), value: attempt.user?.id ?? '—' },
    { label: t('admin.monitoring.colStatus'), value: statusLabels[attempt.status] || attempt.status },
    { label: t('admin.monitoring.colQuestion'), value: `${attempt.answeredCount} / ${attempt.questionCount}` },
    { label: t('admin.monitoring.colStarted'), value: formatDateTime(attempt.startedAt) },
    { label: t('admin.monitoring.colLastActivity'), value: formatDateTime(attempt.lastActivityAt) },
    { label: t('admin.monitoring.detailSubmitted'), value: formatDateTime(attempt.submittedAt) },
    { label: t('admin.monitoring.colBlur'), value: `${attempt.blurEventCount}${attempt.blurEventCount > BLUR_WARN_THRESHOLD ? ' ⚠' : ''}` },
    { label: t('admin.monitoring.colTimeOutside'), value: formatDuration(attempt.totalTimeOutsideSeconds) },
    { label: t('admin.monitoring.colLastPage'), value: attempt.lastKnownPage || '—' },
    { label: t('admin.monitoring.colSuspicion'), value: `${attempt.suspicionScore}${isSusp(attempt) ? ' ⚠' : ''}` },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="monitoring-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="max-w-lg w-full rounded-2xl p-6 shadow-2xl border relative max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ color: 'var(--text-muted)' }}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {isSusp(attempt) && (
          <div className="mb-4 px-4 py-3 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {t('admin.monitoring.suspiciousWarning')}
            </p>
          </div>
        )}

        <h2
          id="monitoring-modal-title"
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('admin.monitoring.detailsTitle')}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {t('admin.monitoring.detailsSubtitle')}
        </p>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium break-words" style={{ color: 'var(--text-primary)' }}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="border px-6 py-2.5 rounded-xl text-sm font-medium transition hover:bg-gray-50 dark:hover:bg-gray-800"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {t('admin.monitoring.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

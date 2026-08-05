import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../api/strapi'
import IconButton from '../../components/IconButton'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function AdminUsers() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [rejectingUser, setRejectingUser] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedUser, setSelectedUser] = useState(null)
  const [editRank, setEditRank] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users?populate=role').then(r => r.data)
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users'])
      setRejectingUser(null)
      setRejectionReason('')
    }
  })

  const handleApprove = (user) => {
    updateMutation.mutate({
      id: user.id,
      data: { verification: 'approved', rejectionReason: null }
    })
  }

  const handleReject = (user) => {
    if (!rejectionReason.trim()) return
    updateMutation.mutate({
      id: user.id,
      data: { verification: 'rejected', rejectionReason }
    })
  }

  const getVerificationBadge = (verification) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    }
    return map[verification] || 'bg-gray-100 text-gray-500'
  }

  if (isLoading) return <p className="text-gray-500">{t('common.loading')}</p>

  const pending = users?.filter(u => u.verification === 'pending') || []
  const others = users?.filter(u => u.verification !== 'pending') || []

  const sortUsers = (arr) => {
    if (!arr) return []
    const copy = [...arr]
    if (sortBy === 'newest') return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (sortBy === 'oldest') return copy.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    if (sortBy === 'name_az') return copy.sort((a, b) => `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`))
    if (sortBy === 'name_za') return copy.sort((a, b) => `${b.firstName}${b.lastName}`.localeCompare(`${a.firstName}${a.lastName}`))
    return copy
  }

  const sortedOthers = sortUsers(others)

  // ── Detail/edit view for selected user ────────────────────────────────────
  if (selectedUser) {
    return (
      <div>
        <button
          onClick={() => { setSelectedUser(null); setEditRank('') }}
          className="text-blue-600 hover:underline text-sm mb-5 block"
        >
          ← {t('admin.users.backToUsers') || 'Back to Users'}
        </button>

        <div className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {selectedUser.firstName} {selectedUser.lastName}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            @{selectedUser.username} — {selectedUser.email}
          </p>

          <div className="max-w-sm">
            <label className="block text-sm font-medium mb-1" htmlFor="user-rank" style={{ color: 'var(--text-primary)' }}>
              {t('admin.users.rankLabel') || 'Rank'}
            </label>
            <input
              id="user-rank"
              type="text"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              value={editRank}
              onChange={e => setEditRank(e.target.value)}
              placeholder={t('admin.users.rankPlaceholder') || 'e.g. 1st Kyu, 1st Dan, etc.'}
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                updateMutation.mutate({
                  id: selectedUser.id,
                  data: { rank: editRank },
                })
                setSelectedUser(null)
                setEditRank('')
              }}
              disabled={updateMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? t('common.saving') || 'Saving...' : t('common.save') || 'Save'}
            </button>
            <button
              onClick={() => { setSelectedUser(null); setEditRank('') }}
              className="border px-6 py-2 rounded-lg hover:bg-gray-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">{t('admin.users.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('admin.users.total', { count: users?.length || 0 })}</p>
        </div>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('admin.users.awaiting')}
            </h2>
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
              {pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {pending.map(user => (
              <div key={user.id} className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>@{user.username}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                    {user.rank && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Rank: {user.rank}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <IconButton icon={CheckCircleIcon} label={t('admin.users.iconApprove')}
                      onClick={() => handleApprove(user)} variant="success"
                      disabled={updateMutation.isPending} />
                    <IconButton icon={XCircleIcon} label={t('admin.users.iconReject')}
                      onClick={() => setRejectingUser(user)} variant="danger" />
                  </div>
                </div>

                {rejectingUser?.id === user.id && (
                  <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      {t('admin.users.rejectionReason')}
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      rows={2}
                      placeholder={t('admin.users.rejectionPlaceholder')}
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleReject(user)}
                        disabled={!rejectionReason.trim() || updateMutation.isPending}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">
                        {t('admin.users.confirmRejection')}
                      </button>
                      <button onClick={() => { setRejectingUser(null); setRejectionReason('') }}
                        className="border px-4 py-2 rounded-lg text-sm"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        {t('admin.users.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sort + table header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('admin.users.allUsers')}
        </h2>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <option value="newest">{t('admin.users.sortNewest')}</option>
          <option value="oldest">{t('admin.users.sortOldest')}</option>
          <option value="name_az">{t('admin.users.sortNameAZ')}</option>
          <option value="name_za">{t('admin.users.sortNameZA')}</option>
        </select>
      </div>

      {/* Users table */}
      <div className="rounded-xl overflow-hidden overflow-x-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full min-w-[600px]">
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.users.colName')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.users.colUsername')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.users.colEmail')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.users.colRank') || 'Rank'}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.users.colStatus')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('admin.users.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedOthers.map(user => (
              <tr key={user.id} className="border-t transition hover:opacity-80 cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => { setSelectedUser(user); setEditRank(user.rank || '') }}>
                <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  @{user.username}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {user.email}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {user.rank || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getVerificationBadge(user.verification)}`}>
                    {user.verification || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <IconButton icon={PencilIcon} label={t('admin.users.iconEdit') || 'Edit user'}
                      onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setEditRank(user.rank || '') }} variant="default" />
                    {user.verification === 'rejected' && (
                      <IconButton icon={ArrowPathIcon} label={t('admin.users.iconReapprove') || 'Re-approve user'}
                        onClick={(e) => { e.stopPropagation(); handleApprove(user) }} variant="success" />
                    )}
                    {user.verification === 'approved' && (
                      <IconButton icon={XCircleIcon} label={t('admin.users.iconRevoke') || 'Revoke access'}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateMutation.mutate({
                            id: user.id,
                            data: { verification: 'rejected', rejectionReason: 'Access revoked by administrator' }
                          })
                        }}
                        variant="danger" disabled={updateMutation.isPending} />
                    )}
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
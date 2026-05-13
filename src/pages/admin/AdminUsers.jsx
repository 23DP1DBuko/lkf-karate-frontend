import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../api/strapi'
import IconButton from '../../components/IconButton'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [rejectingUser, setRejectingUser] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [sortBy, setSortBy] = useState('newest')

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

  if (isLoading) return <p className="text-gray-500">Loading...</p>

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
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Manage Users</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{users?.length} total users</p>
        </div>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Awaiting Approval
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
                  </div>
                  <div className="flex gap-1">
                    <IconButton icon={CheckCircleIcon} label="Approve user"
                      onClick={() => handleApprove(user)} variant="success"
                      disabled={updateMutation.isPending} />
                    <IconButton icon={XCircleIcon} label="Reject user"
                      onClick={() => setRejectingUser(user)} variant="danger" />
                  </div>
                </div>

                {rejectingUser?.id === user.id && (
                  <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Rejection Reason
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      rows={2}
                      placeholder="e.g. Unknown judge surname, please use your real name..."
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleReject(user)}
                        disabled={!rejectionReason.trim() || updateMutation.isPending}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">
                        Confirm Rejection
                      </button>
                      <button onClick={() => { setRejectingUser(null); setRejectionReason('') }}
                        className="border px-4 py-2 rounded-lg text-sm"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        Cancel
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
          All Users
        </h2>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name_az">Name A→Z</option>
          <option value="name_za">Name Z→A</option>
        </select>
      </div>

      {/* Users table */}
      <div className="rounded-xl overflow-hidden overflow-x-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full min-w-[600px]">
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Username</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedOthers.map(user => (
              <tr key={user.id} className="border-t transition hover:opacity-80"
                style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  @{user.username}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getVerificationBadge(user.verification)}`}>
                    {user.verification || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    {user.verification === 'rejected' && (
                      <IconButton icon={ArrowPathIcon} label="Re-approve user"
                        onClick={() => handleApprove(user)} variant="success" />
                    )}
                    {user.verification === 'approved' && (
                      <IconButton icon={XCircleIcon} label="Revoke access"
                        onClick={() => updateMutation.mutate({
                          id: user.id,
                          data: { verification: 'rejected', rejectionReason: 'Access revoked by administrator' }
                        })}
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
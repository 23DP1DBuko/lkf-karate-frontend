import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../api/strapi'
import IconButton from '../../components/IconButton'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [rejectingUser, setRejectingUser] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

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

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-700 mb-2">Manage Users</h1>
      <p className="text-gray-500 mb-8">{users?.length} total users</p>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">
              {pending.length} pending
            </span>
            Awaiting Approval
          </h2>
          <div className="space-y-3">
            {pending.map(user => (
              <div key={user.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <IconButton
                      icon={CheckCircleIcon}
                      label="Approve user"
                      onClick={() => handleApprove(user)}
                      variant="success"
                      disabled={updateMutation.isPending}
                    />
                    <IconButton
                      icon={XCircleIcon}
                      label="Reject user"
                      onClick={() => setRejectingUser(user)}
                      variant="danger"
                    />
                  </div>
                </div>

                {rejectingUser?.id === user.id && (
                  <div className="mt-4 border-t pt-4">
                    <label className="block text-sm font-medium mb-2">Rejection Reason</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      rows={2}
                      placeholder="e.g. Unknown judge surname, please use your real name..."
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReject(user)}
                        disabled={!rejectionReason.trim() || updateMutation.isPending}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => { setRejectingUser(null); setRejectionReason('') }}
                        className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                      >
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

      {/* All other users */}
      <h2 className="text-lg font-semibold mb-4">All Users</h2>
      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Username</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {others.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4 text-sm text-gray-500">@{user.username}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getVerificationBadge(user.verification)}`}>
                    {user.verification || 'unknown'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.verification === 'rejected' && (
                    <IconButton
                      icon={ArrowPathIcon}
                      label="Re-approve user"
                      onClick={() => handleApprove(user)}
                      variant="success"
                    />
                  )}
                  {user.verification === 'approved' && (
                    <IconButton
                      icon={XCircleIcon}
                      label="Revoke access"
                      onClick={() => updateMutation.mutate({
                        id: user.id,
                        data: { verification: 'rejected', rejectionReason: 'Access revoked by administrator' }
                      })}
                      variant="danger"
                      disabled={updateMutation.isPending}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
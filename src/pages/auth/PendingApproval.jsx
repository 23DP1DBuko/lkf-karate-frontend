import { useAuth } from '../../context/AuthContext'

export default function PendingApproval() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {user?.verification === 'rejected' ? (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Account Rejected</h1>
            <p className="text-gray-500 mb-4">Your account was not approved.</p>
            {user?.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-red-700 mb-1">Reason:</p>
                <p className="text-sm text-red-600">{user.rejectionReason}</p>
              </div>
            )}
            <p className="text-sm text-gray-400 mb-6">
              Please contact the administrator if you believe this is a mistake.
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-yellow-600 mb-2">Awaiting Approval</h1>
            <p className="text-gray-500 mb-4">
              Your account is pending approval from an administrator.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              You will be notified once your account has been reviewed. This usually takes 1-2 business days.
            </p>
          </>
        )}
        <button
          onClick={logout}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 w-full"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
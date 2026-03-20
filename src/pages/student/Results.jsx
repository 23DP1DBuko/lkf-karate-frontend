import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/strapi'

export default function Results() {
  const { user } = useAuth()

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['attempts', user?.id],
    queryFn: () => api.get(`/exam-attempts?filters[user][id][$eq]=${user.id}&populate=exam&sort=createdAt:desc`).then(r => r.data.data)
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-gray-500">Loading results...</p>
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-700 mb-2">My Results</h1>
      <p className="text-gray-500 mb-8">Your exam history</p>

      {attempts?.length === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-gray-400">No exams taken yet. Go take a course!</p>
        </div>
      )}

      <div className="space-y-4">
        {attempts?.map(attempt => (
          <div key={attempt.id} className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{attempt.exam?.title || 'Exam'}</h3>
              <p className="text-sm text-gray-400">
                {attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleDateString()
                  : 'In progress'}
              </p>
            </div>

            <div className="text-right">
              {attempt.submittedAt ? (
                <>
                  <div className={`text-3xl font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {attempt.score}%
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {attempt.passed ? 'Passed' : 'Failed'}
                  </span>
                </>
              ) : (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                  In Progress
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
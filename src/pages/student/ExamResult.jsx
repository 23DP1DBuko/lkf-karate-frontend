import { useLocation, useNavigate } from 'react-router-dom'

export default function ExamResult() {
  const { state } = useLocation()
  const navigate = useNavigate()

  if (!state) {
    navigate('/courses')
    return null
  }

  const { score, passed, correct, total, showResults } = state
  console.log('showResults value:', showResults, typeof showResults)
  if (!showResults) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="text-2xl font-bold mb-2">Exam Submitted</h1>
          <p className="text-gray-500 mb-6">
            Your answers have been recorded. Results will be announced by the administrator.
          </p>
          <button
            onClick={() => navigate('/courses')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 w-full"
          >
            Back to Courses
          </button>
        </div>
        {console.log('Results are hidden by admin settings')}
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className={`text-6xl mb-4`}>
          {passed ? '🎉' : '😔'}
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {passed ? 'Congratulations!' : 'Not Passed'}
        </h1>
        <p className="text-gray-500 mb-6">
          {passed ? 'You passed the exam!' : 'Keep studying and try again.'}
        </p>

        <div className={`text-6xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
          {score}%
        </div>
        <p className="text-gray-500 mb-8">
          {correct} out of {total} correct
        </p>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-8">
          <div
            className={`h-3 rounded-full transition-all ${passed ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <button
          onClick={() => navigate('/courses')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 w-full"
        >
          Back to Courses
        </button>
      </div>
    </div>
  )
}
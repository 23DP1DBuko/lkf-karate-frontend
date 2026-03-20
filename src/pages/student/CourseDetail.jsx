import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/strapi'

export default function CourseDetail() {
  const { documentId } = useParams()

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', documentId],
    queryFn: () => api.get(`/courses/${documentId}`).then(r => r.data.data)
  })

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', documentId],
    queryFn: () => api.get(`/chapters?filters[course][documentId][$eq]=${documentId}&sort=order:asc`).then(r => r.data.data)
  })

  const { data: exams } = useQuery({
    queryKey: ['exams', documentId],
    queryFn: () => api.get(`/exams?filters[course][documentId][$eq]=${documentId}`).then(r => r.data.data)
})

  if (courseLoading || chaptersLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div>
        <Link to="/courses" className="text-blue-600 hover:underline text-sm mb-4 block">
          ← Back to Courses
        </Link>

        <h1 className="text-3xl font-bold text-blue-700 mb-2">{course?.title}</h1>
        <p className="text-gray-500 mb-8">{course?.description}</p>

        <h2 className="text-xl font-semibold mb-4">Chapters</h2>

        {chapters?.length === 0 && (
          <p className="text-gray-400">No chapters available yet.</p>
        )}

        <div className="space-y-3">
          {chapters?.map((chapter, index) => (
            <Link
              key={chapter.id}
              to={`/courses/${documentId}/chapters/${chapter.documentId}`}
              className="bg-white rounded-xl shadow hover:shadow-md transition p-5 flex items-center gap-4 block"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {index + 1}
              </div>
              <div>
                <h3 className="font-semibold">{chapter.title}</h3>
                {chapter.videoUrl && (
                  <span className="text-xs text-gray-400">📹 Includes video</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {exams?.length > 0 && (
        <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Exams</h2>
            <div className="space-y-3">
            {exams.map(exam => (
                <Link
                key={exam.id}
                to={`/exam/${exam.documentId}`}
                className="bg-white rounded-xl shadow hover:shadow-md transition p-5 flex items-center justify-between block"
                >
                <div>
                    <h3 className="font-semibold">{exam.title}</h3>
                    <p className="text-sm text-gray-400">{exam.duration} minutes • {exam.questionCount} questions</p>
                </div>
                <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Start Exam
                </span>
                </Link>
            ))}
            </div>
        </div>
        )}
    </div>
  )
}
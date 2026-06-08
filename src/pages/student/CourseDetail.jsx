import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api, { getLocalizedField } from '../../api/strapi'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useTranslation } from 'react-i18next'

export default function CourseDetail() {
  const { documentId } = useParams()
  const { i18n } = useTranslation()

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', documentId],
    queryFn: () => api.get(`/courses/${documentId}`).then(r => r.data.data)
  })

  usePageTitle(course?.title)

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', documentId],
    queryFn: () => api.get(`/chapters?filters[course][documentId][$eq]=${documentId}&sort=order:asc`).then(r => r.data.data)
  })

  const { data: progressData } = useQuery({
    queryKey: ['chapter-progress'],
    queryFn: () => api.get('/chapter-progress').then(r => r.data.data)
  })

  const { data: exams } = useQuery({
    queryKey: ['exams', documentId],
    queryFn: () => api.get(`/exams?filters[course][documentId][$eq]=${documentId}`).then(r => r.data.data)
  })

  const getExamWindowState = (exam) => {
    const now = new Date()
    const openAt = exam.openAt ? new Date(exam.openAt) : null
    const closeAt = exam.closeAt ? new Date(exam.closeAt) : null

    if (openAt && now < openAt) {
      return { state: 'upcoming', label: `Opens on ${openAt.toLocaleString()}` }
    }

    if (closeAt && now > closeAt) {
      return { state: 'closed', label: 'Closed' }
    }

    return { state: 'open', label: 'Start Exam' }
  }

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

        <h1 className="text-3xl font-bold text-blue-700 mb-2">
          {getLocalizedField(course, i18n.language, 'title') || course?.title}
        </h1>
        <p className="text-gray-500 mb-8">
          {getLocalizedField(course, i18n.language, 'description') || course?.description}
        </p>

        <h2 className="text-xl font-semibold mb-4">Chapters</h2>

        {chapters?.length === 0 && (
          <p className="text-gray-400">No chapters available yet.</p>
        )}

        <div className="space-y-3">
          {chapters?.map((chapter, index) => {
            const seen = progressData?.some(p => p.chapter?.documentId === chapter.documentId)
            return (
              <Link
                key={chapter.id}
                to={`/courses/${documentId}/chapters/${chapter.documentId}`}
                className="bg-white rounded-xl shadow hover:shadow-md transition p-5 flex items-center gap-4 block"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${seen ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {seen ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{getLocalizedField(chapter, i18n.language, 'title') || chapter?.title}</h3>
                  {chapter.videoUrl && (
                    <span className="text-xs text-gray-400">📹 Includes video</span>
                  )}
                </div>
                {seen && (
                  <span className="text-xs text-green-600 font-medium">Completed</span>
                )}
              </Link>
            )
          })}
        </div>
          {chapters?.length > 0 && (
            <div className="mt-6">
              <Link
                to={`/courses/${documentId}/quiz`}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 inline-flex items-center gap-2"
              >
                🎯 Quick Quiz
              </Link>
            </div>
          )}
        {(() => {
          const now = new Date()

          const activeExams = exams?.filter(exam => {
            const closeAt = exam.closeAt ? new Date(exam.closeAt) : null
            return !closeAt || closeAt >= now
          }) || []

          const archivedExams = exams?.filter(exam => {
            const closeAt = exam.closeAt ? new Date(exam.closeAt) : null
            return closeAt && closeAt < now
          }) || []

          return (
            <>
              {activeExams.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Active Exams</h2>
                  <div className="space-y-3">
                    {activeExams.map(exam => {
                      const windowState = getExamWindowState(exam)
                      return (
                        <div
                          key={exam.id}
                          className="bg-white rounded-xl shadow hover:shadow-md transition p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div>
                            <h3 className="font-semibold">
                              {getLocalizedField(exam, i18n.language, 'title') || exam.title}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {exam.duration} minutes • {exam.questionCount} questions
                            </p>
                          </div>

                          {windowState.state === 'open' ? (
                            <Link
                              to={`/exam/${exam.documentId}`}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto text-center"
                            >
                              Start Exam
                            </Link>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto text-center">
                              {windowState.label}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {archivedExams.length > 0 && (
                <div className="mt-8">
                  <details className="rounded-xl border border-gray-200 bg-white">
                    <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-gray-700">
                      Archived Exams ({archivedExams.length})
                    </summary>
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      {archivedExams.map(exam => {
                        return (
                          <div
                            key={exam.id}
                            className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div>
                              <h3 className="font-semibold text-gray-700">
                                {getLocalizedField(exam, i18n.language, 'title') || exam.title}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {exam.duration} minutes • {exam.questionCount} questions
                              </p>
                            </div>

                            <span className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto text-center">
                              Closed
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </details>
                </div>
              )}
            </>
          )
        })()}
    </div>
  )
}
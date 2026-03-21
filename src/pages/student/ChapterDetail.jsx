import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import api from '../../api/strapi'

function RichText({ content }) {
  if (!content) return null
  return (
    <div className="prose max-w-none">
      {content.map((block, i) => {
        if (block.type === 'paragraph') {
          return (
            <p key={i} className="mb-4 text-gray-700 leading-relaxed">
              {block.children?.map(child => child.text).join('')}
            </p>
          )
        }
        if (block.type === 'heading') {
          return (
            <h3 key={i} className="text-xl font-semibold mb-3">
              {block.children?.map(child => child.text).join('')}
            </h3>
          )
        }
        return null
      })}
    </div>
  )
}

function YouTubeEmbed({ url }) {
  if (!url) return null
  const videoId = url.split('v=')[1]?.split('&')[0]
  if (!videoId) return null
  return (
    <div className="aspect-video mb-6 rounded-xl overflow-hidden shadow">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        allowFullScreen
        title="Chapter video"
      />
    </div>
  )
}

export default function ChapterDetail() {
  const { documentId, chapterDocumentId } = useParams()
  const queryClient = useQueryClient()

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', chapterDocumentId],
    queryFn: () => api.get(`/chapters/${chapterDocumentId}`).then(r => r.data.data)
  })

  const { data: progressData } = useQuery({
    queryKey: ['chapter-progress'],
    queryFn: () => api.get('/chapter-progress').then(r => r.data.data)
  })

  const markSeenMutation = useMutation({
    mutationFn: (chapterId) => api.post('/chapter-progress/mark-seen', { chapterId }),
    onSuccess: () => queryClient.invalidateQueries(['chapter-progress'])
  })

  useEffect(() => {
    if (chapter?.documentId) {
      markSeenMutation.mutate(chapter.documentId)
    }
  }, [chapter?.documentId])

  const isSeen = progressData?.some(p => p.chapter?.documentId === chapter?.documentId)

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-gray-500">Loading chapter...</p>
    </div>
  )

  return (
    <div>
      <Link
        to={`/courses/${documentId}`}
        className="text-blue-600 hover:underline text-sm mb-4 block"
      >
        ← Back to Course
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold text-blue-700">{chapter?.title}</h1>
        {isSeen && (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
            ✓ Completed
          </span>
        )}
      </div>

      <YouTubeEmbed url={chapter?.videoUrl} />

      <div className="bg-white rounded-xl shadow p-6">
        <RichText content={chapter?.content} />
      </div>
    </div>
  )
}
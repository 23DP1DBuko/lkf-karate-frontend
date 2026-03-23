import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import api from '../../api/strapi'
import { mediaUrl } from '../../api/media'

function MediaDisplay({ media }) {
  if (!media) return null
  
  if (Array.isArray(media)) {
    return (
      <div className="space-y-4 mb-6">
        {media.map((item, i) => {
          if (item.mime?.startsWith('video/')) {
            return (
              <video key={i} controls className="w-full rounded-xl shadow">
                <source src={mediaUrl(item.url)} type={item.mime} />
              </video>
            )
          }
          if (item.mime?.startsWith('image/')) {
            return (
              <img
                key={i}
                src={mediaUrl(item.url)}
                alt={item.alternativeText || 'Chapter media'}
                className="w-full rounded-xl shadow object-cover"
              />
            )
          }
          return null
        })}
      </div>
    )
  }

  if (media.mime?.startsWith('video/')) {
    return (
      <video controls className="w-full rounded-xl shadow mb-6">
        <source src={mediaUrl(media.url)} type={media.mime} />
      </video>
    )
  }

  if (media.mime?.startsWith('image/')) {
    return (
      <img
        src={mediaUrl(media.url)}
        alt={media.alternativeText || 'Chapter media'}
        className="w-full rounded-xl shadow object-cover mb-6"
      />
    )
  }

  return null
}

function ChapterContent({ content }) {
  if (!content) return null
  
  if (typeof content === 'string') {
    return (
      <div
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return (
    <div className="prose prose-slate max-w-none">
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
    queryFn: () => api.get(`/chapters/${chapterDocumentId}?populate=media`).then(r => r.data.data)
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
      <MediaDisplay media={chapter?.media} />
      <div className="bg-white rounded-xl shadow p-6">
        <ChapterContent content={chapter?.content} />
      </div>
    </div>
  )
}
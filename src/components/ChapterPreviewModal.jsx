import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { mediaUrl } from '../api/media'

function YouTubeEmbed({ url }) {
  if (!url) return null
  
  let videoId = ''
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1)
    } else {
      videoId = u.searchParams.get('v') || ''
    }
  } catch {
    return null
  }

  if (!videoId) return null

  return (
    <div className="rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="Chapter video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}

function ChapterMedia({ media }) {
  if (!media || media.length === 0) return null
  const items = Array.isArray(media) ? media : [media]

  return (
    <div className="mb-6 space-y-3">
      {items.map((item, i) => {
        if (!item) return null
        if (item.mime?.startsWith('image/')) {
          return (
            <figure key={i} className="rounded-xl overflow-hidden">
              <img
                src={mediaUrl(item.url)}
                alt={item.alternativeText || item.name || 'Chapter image'}
                className="w-full object-cover max-h-96"
              />
              {item.caption && (
                <figcaption className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                  {item.caption}
                </figcaption>
              )}
            </figure>
          )
        }
        if (item.mime?.startsWith('video/')) {
          return (
            <video key={i} controls className="w-full rounded-xl max-h-96">
              <source src={mediaUrl(item.url)} type={item.mime} />
            </video>
          )
        }
        return null
      })}
    </div>
  )
}

function RichContent({ html }) {
  if (!html) return null
  return (
    <div
      className="prose prose-sm max-w-none mb-6"
      style={{ color: 'var(--text-primary)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default function ChapterPreviewModal({ chapter, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!chapter) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl shadow-2xl mb-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b rounded-t-2xl sticky top-0 z-10"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Preview
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Chapter {chapter.order}
              </span>
            </div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {chapter.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Close preview"
          >
            <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Student-facing content */}
        <div className="px-6 py-8">
          
          {/* Chapter title — as student sees it */}
          <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {chapter.title}
          </h1>

          {/* Video first (MOOC style) */}
          <YouTubeEmbed url={chapter.videoUrl} />

          {/* Rich text content */}
          <RichContent html={chapter.content} />

          {/* Images / media */}
          <ChapterMedia media={chapter.media} />

          {/* Questions preview */}
          {chapter.questions?.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
                <span className="text-sm font-semibold px-3" style={{ color: 'var(--text-muted)' }}>
                  📝 Chapter Quiz ({chapter.questions.length} questions)
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
              </div>

              <div className="space-y-4">
                {chapter.questions.slice(0, 3).map((q, i) => (
                  <div key={i} className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                      <span className="text-blue-600 mr-1">{i + 1}.</span>
                      {q.text || q.textLv}
                    </p>
                    {q.type === 'yes_no' && (
                      <div className="flex gap-3">
                        {['Yes', 'No'].map(opt => (
                          <div key={opt} className="px-4 py-2 rounded-lg border text-sm cursor-default"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt, j) => (
                          <div key={j} className="px-3 py-2 rounded-lg border text-sm cursor-default"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {chapter.questions.length > 3 && (
                  <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    + {chapter.questions.length - 3} more questions in the actual chapter
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!chapter.videoUrl && !chapter.content && (!chapter.media || chapter.media.length === 0) && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📄</p>
              <p style={{ color: 'var(--text-muted)' }}>This chapter has no content yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between rounded-b-2xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            This is how the chapter appears to students
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
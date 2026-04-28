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

function getYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v') || ''
  } catch { return '' }
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
  <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
    {chapter.title}
  </h1>

  {chapter.blocks?.length > 0 ? (
    // New block-based rendering
    <div className="space-y-6">
      {chapter.blocks.map((block, i) => {
        if (block.type === 'text') return (
          <div key={i} className="prose prose-sm max-w-none"
            style={{ color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: block.content }} />
        )
        if (block.type === 'video') {
          const videoId = getYouTubeId(block.url)
          if (!videoId) return null
          return (
            <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <iframe src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full" allowFullScreen title="Video" />
            </div>
          )
        }
        if (block.type === 'image_url') return (
          <figure key={i} className="rounded-xl overflow-hidden">
            <img src={block.url} alt={block.caption || ''} className="w-full object-cover max-h-96" />
            {block.caption && (
              <figcaption className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                {block.caption}
              </figcaption>
            )}
          </figure>
        )
        if (block.type === 'note') return (
          <div key={i} className="border-l-4 border-blue-500 pl-4 py-3 rounded-r-lg"
            style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{block.content}</p>
          </div>
        )
        return null
      })}
    </div>
  ) : (
    // Fallback for old chapters without blocks
    <>
      <YouTubeEmbed url={chapter.videoUrl} />
      <RichContent html={chapter.content} />
      <ChapterMedia media={chapter.media} />
    </>
  )}

  {/* Questions always show at bottom */}
  {chapter.questions?.length > 0 && (
    <div className="mt-8">
      {/* ... questions preview ... */}
    </div>
  )}

  {/* Empty state */}
  {!chapter.blocks?.length && !chapter.videoUrl && !chapter.content && 
   (!chapter.media || chapter.media.length === 0) && (
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
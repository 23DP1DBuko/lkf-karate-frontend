// ChapterPreviewModal.jsx — FULL CLEAN VERSION
import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { mediaUrl } from '../api/media'

// ─── Shared helpers (copied here so the modal has zero external deps) ─────────

function resolveImageSrc(block) {
  if (block.media?.file?.url) return mediaUrl(block.media.file.url)
  if (block.mediaItems?.[0]?.file?.url) return mediaUrl(block.mediaItems[0].file.url)
  if (block.file?.url) return mediaUrl(block.file.url)
  if (block.media?.url) return mediaUrl(block.media.url)
  if (block.url) return block.url
  return null
}

function getYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v') || null
  } catch { return null }
}

function getBlockFile(block) {
  return block.media?.file || block.file || block.mediaItems?.[0]?.file || null
}

// ─── Legacy media renderer (old chapters without blocks) ─────────────────────

function LegacyMedia({ media }) {
  if (!media?.length) return null
  return (
    <div className="mb-6 space-y-3">
      {media.map((item, i) => {
        if (!item?.url) return null
        const src = mediaUrl(item.url)
        if (item.mime?.startsWith('image/')) return (
          <figure key={i} className="rounded-xl overflow-hidden">
            <img
              src={src}
              alt={item.alternativeText || item.name || ''}
              className="w-full object-cover max-h-96"
            />
            {item.caption && (
              <figcaption className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                {item.caption}
              </figcaption>
            )}
          </figure>
        )
        if (item.mime?.startsWith('video/')) return (
          <video key={i} controls className="w-full rounded-xl max-h-96">
            <source src={src} type={item.mime} />
          </video>
        )
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

// ─── Block renderer for preview (read-only, no interactive questions) ─────────

function PreviewBlock({ block, i }) {
  if (block.type === 'text') return (
    <div
      key={i}
      className="prose prose-sm max-w-none"
      style={{ color: 'var(--text-primary)' }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  )

  if (block.type === 'video') {
    const videoId = getYouTubeId(block.url)
    if (!videoId) return null
    return (
      <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full"
          allowFullScreen
          title="Video"
        />
      </div>
    )
  }

  if (block.type === 'image' || block.type === 'image_url') {
    const file = getBlockFile(block)
    const src = resolveImageSrc(block)
    if (!src) return null

    if (file?.mime?.startsWith('video/')) {
      return (
        <figure key={i} className="rounded-xl overflow-hidden shadow">
          <video controls className="w-full max-h-96 bg-black">
            <source src={src} type={file.mime} />
          </video>
          {block.caption && (
            <figcaption className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
              {block.caption}
            </figcaption>
          )}
        </figure>
      )
    }

    return (
      <figure key={i} className="rounded-xl overflow-hidden shadow">
        <img
          src={src}
          alt={block.caption || block.alt || file?.alternativeText || ''}
          className="w-full object-cover max-h-96"
        />
        {block.caption && (
          <figcaption className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  if (block.type === 'note') return (
    <div
      key={i}
      className="border-l-4 border-blue-500 pl-4 py-3 rounded-r-lg"
      style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}
    >
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{block.content}</p>
    </div>
  )

  if (block.type === 'question' || block.type === 'bank_question') return (
    <div
      key={i}
      className="rounded-xl p-4 border"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        <span className="text-blue-600 mr-1">Q.</span>
        {block.content}
      </p>
      {(block.questionType === 'yes_no' || !block.questionType) && (
        <div className="flex gap-3">
          {['Yes', 'No'].map(opt => (
            <div
              key={opt}
              className="px-4 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
      {block.questionType === 'multiple_choice' && (
        <div className="space-y-2">
          {(block.options || []).filter(o => o.trim()).map((opt, j) => (
            <div
              key={j}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs mt-2 text-green-600">✓ Correct: {block.correctAnswer}</p>
    </div>
  )

  return null
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ChapterPreviewModal({ chapter, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!chapter) return null

  const hasBlocks = chapter.blocks?.length > 0
  const hasLegacyContent = chapter.videoUrl || chapter.content || chapter.media?.length

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-3xl rounded-2xl shadow-2xl mb-8"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b rounded-t-2xl sticky top-0 z-10"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
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

        {/* Content */}
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {chapter.title}
          </h1>

          {/* ── Block-based (new chapters) ── */}
          {hasBlocks && (
            <div className="space-y-6">
              {chapter.blocks.map((block, i) => (
                <PreviewBlock key={i} block={block} i={i} />
              ))}
            </div>
          )}

          {/* ── Legacy fallback (old chapters) ── */}
          {!hasBlocks && hasLegacyContent && (
            <>
              {chapter.videoUrl && (() => {
                const vid = getYouTubeId(chapter.videoUrl)
                if (!vid) return null
                return (
                  <div className="rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${vid}`}
                      className="w-full h-full"
                      allowFullScreen
                      title="Chapter video"
                    />
                  </div>
                )
              })()}
              <RichContent html={chapter.content} />
              <LegacyMedia media={chapter.media} />
            </>
          )}

          {/* ── Empty state ── */}
          {!hasBlocks && !hasLegacyContent && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📄</p>
              <p style={{ color: 'var(--text-muted)' }}>This chapter has no content yet.</p>
            </div>
          )}

          {/* ── Legacy standalone questions (old relation, not in blocks) ── */}
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
                {chapter.questions.map((q, i) => (
                  <div
                    key={q.id || i}
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                      <span className="text-blue-600 mr-1">{i + 1}.</span>
                      {q.text || q.textLv || ''}
                    </p>
                    {q.type === 'yes_no' && (
                      <div className="flex gap-3">
                        {['Yes', 'No'].map(opt => (
                          <div
                            key={opt}
                            className="px-4 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt, j) => (
                          <div
                            key={j}
                            className="px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between rounded-b-2xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
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

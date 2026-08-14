// ChapterDetail.jsx — student chapter view. New chapters render their blocks
// through the shared <ChapterBlocks> document renderer; legacy chapters fall
// back to videoUrl/content/media.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import api from '../../api/strapi'
import { mediaUrl } from '../../api/media'
import { useTranslation } from 'react-i18next'
import { getLocalizedField, getLocalizedArray } from '../../api/strapi'
import ChapterBlocks from '../../components/ChapterBlocks'
import {
  CheckIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'

// ─── RichText viewer (NOT the editor – just renders saved HTML) ───────────────
function RichText({ content }) {
  if (!content) return null
  if (typeof content === 'string') {
    return (
      <div
        className="prose prose-slate max-w-none"
        style={{ color: 'var(--text-primary)' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  // Slate/Strapi rich-text JSON fallback
  return (
    <div className="prose prose-slate max-w-none" style={{ color: 'var(--text-primary)' }}>
      {content.map((block, i) => {
        if (block.type === 'paragraph') return (
          <p key={i} className="mb-4 leading-relaxed">
            {block.children?.map(c => c.text).join('')}
          </p>
        )
        if (block.type === 'heading') return (
          <h3 key={i} className="text-xl font-semibold mb-3">
            {block.children?.map(c => c.text).join('')}
          </h3>
        )
        return null
      })}
    </div>
  )
}

// ─── YouTube video ID extractor ───────────────────────────────────────────────
function getYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v') || null
  } catch { return null }
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ChapterDetail() {
  const { documentId, chapterDocumentId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredIds, setAnsweredIds] = useState(new Set())
  const [indexOpen, setIndexOpen] = useState(false)
  const indexRef = useRef(null)
  const contentEndRef = useRef(null)
  const markedOnScrollRef = useRef(false)
  const { i18n, t } = useTranslation()

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', chapterDocumentId],
    queryFn: () =>
      api.get(`/chapters/${chapterDocumentId}?populate=*`).then(r => r.data.data),
  })

  const { data: allChapters } = useQuery({
    queryKey: ['chapters', documentId],
    queryFn: () =>
      api
        .get(`/chapters?filters[course][documentId][$eq]=${documentId}&sort=order:asc`)
        .then(r => r.data.data),
  })

  const { data: progressData } = useQuery({
    queryKey: ['chapter-progress'],
    queryFn: () => api.get('/chapter-progress').then(r => r.data.data),
  })

  const markSeenMutation = useMutation({
    mutationFn: (chapterId) =>
      api.post('/chapter-progress/mark-seen', { chapterId }),
    onSuccess: () => queryClient.invalidateQueries(['chapter-progress']),
  })

  const isSeen = progressData?.some(
    p => p.chapter?.documentId === chapter?.documentId
  )

  const blocks = chapter ? getLocalizedArray(chapter, i18n.language, 'blocks') : []
  const totalQuestions = blocks.filter(
    b => b.type === 'question' || b.type === 'bank_question'
  ).length
  const allCorrect = totalQuestions > 0 && correctCount >= totalQuestions

  useEffect(() => {
    setCorrectCount(0)
    setAnsweredIds(new Set())
  }, [chapterDocumentId])

  // Questionless chapters: mark as seen only when the reader reaches the
  // end of the content (no more instant 'Completed' on first view).
  useEffect(() => {
    if (!chapter?.documentId || totalQuestions > 0) return
    markedOnScrollRef.current = false
    const el = contentEndRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !markedOnScrollRef.current) {
          markedOnScrollRef.current = true
          markSeenMutation.mutate(chapter.documentId)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -20% 0px', threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.documentId, totalQuestions])

  // Close the chapter index on outside click / Escape
  useEffect(() => {
    if (!indexOpen) return
    const onPointer = (e) => {
      if (indexRef.current && !indexRef.current.contains(e.target)) {
        setIndexOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setIndexOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [indexOpen])

  const handleCorrect = (questionId) => {
    if (answeredIds.has(questionId)) return
    const newAnswered = new Set([...answeredIds, questionId])
    setAnsweredIds(newAnswered)
    const newCount = correctCount + 1
    setCorrectCount(newCount)
    if (newCount >= totalQuestions && totalQuestions > 0) {
      markSeenMutation.mutate(chapter.documentId)
    }
  }

  const currentIndex =
    allChapters?.findIndex(c => c.documentId === chapterDocumentId) ?? -1
  const nextChapter = allChapters?.[currentIndex + 1]

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <p style={{ color: 'var(--text-secondary)' }}>Loading chapter...</p>
      </div>
    )

  const hasBlocks = blocks.length > 0
  const hasLegacyContent =
    chapter?.videoUrl || chapter?.content || chapter?.media?.length

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to={`/courses/${documentId}`}
        className="text-blue-600 hover:underline text-sm mb-4 block"
      >
        ← Back to Course
      </Link>

      {/* ── Sticky wayfinding header ── */}
      {allChapters?.length > 0 && (
        <div
          className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2.5 pb-3 mb-8 border-b bg-white/85 dark:bg-slate-900/85 backdrop-blur-md"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('chapter.chapterXOfY', { current: currentIndex + 1, total: allChapters.length })}
              </p>
              <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {getLocalizedField(chapter, i18n.language, 'title') || chapter?.titleLv}
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {totalQuestions > 0 && (
                <span
                  className="text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  {correctCount}/{totalQuestions}
                </span>
              )}
              {isSeen && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  {t('course.completed')}
                </span>
              )}

              {/* Chapter index dropdown */}
              <div className="relative" ref={indexRef}>
                <button
                  onClick={() => setIndexOpen(o => !o)}
                  aria-expanded={indexOpen}
                  aria-label={t('chapter.chapterIndex')}
                  className={`p-2 rounded-lg transition flex items-center gap-0.5 ${
                    indexOpen
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={{ color: indexOpen ? undefined : 'var(--text-secondary)' }}
                >
                  <ListBulletIcon className="w-5 h-5" />
                  <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${indexOpen ? 'rotate-180' : ''}`} />
                </button>

                {indexOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-xl shadow-xl border p-2 z-40"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1.5" style={{ color: 'var(--text-muted)' }}>
                      {t('chapter.chapterIndex')}
                    </p>
                    {allChapters.map((c, i) => {
                      const seen = progressData?.some(p => p.chapter?.documentId === c.documentId)
                      const isCurrent = c.documentId === chapter?.documentId
                      return (
                        <button
                          key={c.documentId}
                          onClick={() => {
                            setIndexOpen(false)
                            navigate(`/courses/${documentId}/chapters/${c.documentId}`)
                          }}
                          className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition ${
                            isCurrent
                              ? 'bg-blue-50 dark:bg-blue-500/15'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                              seen
                                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                                : isCurrent
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-slate-400'
                            }`}
                          >
                            {seen ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
                          </span>
                          <span
                            className={`text-sm truncate ${isCurrent ? 'font-semibold' : ''}`}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {getLocalizedField(c, i18n.language, 'title') || c.titleLv}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Block-based content (new chapters) ── */}
      {hasBlocks && (
        <ChapterBlocks
          blocks={blocks}
          language={i18n.language}
          onCorrect={handleCorrect}
        />
      )}

      {/* ── Legacy content fallback (old chapters without blocks) ── */}
      {!hasBlocks && hasLegacyContent && (
        <div className="space-y-6 mb-6">
          {chapter.videoUrl && (() => {
            const vid = getYouTubeId(chapter.videoUrl)
            if (!vid) return null
            return (
              <div className="aspect-video rounded-xl overflow-hidden shadow">
                <iframe
                  src={`https://www.youtube.com/embed/${vid}`}
                  className="w-full h-full"
                  allowFullScreen
                  title="Chapter video"
                />
              </div>
            )
          })()}
          {chapter.content && (
            <div className="rounded-xl shadow p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
              <RichText content={chapter.content} />
            </div>
          )}
          {chapter.media?.length > 0 && (
            <div className="space-y-4">
              {chapter.media.map((item, i) => {
                if (!item?.url) return null
                const src = mediaUrl(item.url)
                if (item.mime?.startsWith('image/')) return (
                  <figure key={i} className="rounded-xl overflow-hidden shadow" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <div className="flex items-center justify-center p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <img src={src} alt={item.alternativeText || ''} loading="lazy" className="max-h-[30rem] w-auto max-w-full rounded-lg object-contain shadow-sm" />
                    </div>
                    {item.caption && (
                      <figcaption className="text-xs text-center px-4 py-3 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
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
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasBlocks && !hasLegacyContent && (
        <div className="text-center py-12">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <DocumentTextIcon className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p style={{ color: 'var(--text-muted)' }}>This chapter has no content yet.</p>
        </div>
      )}

      {/* ── Progress bar ── */}
      {totalQuestions > 0 && (
        <div
          className="mb-6 p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
            {correctCount} / {totalQuestions} questions answered correctly
          </p>
          <div
            className="w-full rounded-full h-2 overflow-hidden"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${(correctCount / totalQuestions) * 100}%` }}
            />
          </div>
          {allCorrect && (
            <p className="text-green-600 font-semibold text-sm text-center mt-3 inline-flex items-center justify-center gap-1.5 w-full">
              <CheckCircleIcon className="w-4 h-4" />
              {t('chapter.chapterComplete')}
            </p>
          )}
        </div>
      )}

      {/* ── End-of-content sentinel (triggers 'seen' for questionless chapters) ── */}
      {totalQuestions === 0 && <div ref={contentEndRef} aria-hidden="true" className="h-px w-full" />}

      {/* ── Navigation ── */}
      <div className="flex justify-end mb-8">
        {nextChapter ? (
          <button
            onClick={() =>
              navigate(`/courses/${documentId}/chapters/${nextChapter.documentId}`)
            }
            className="px-6 py-3 rounded-xl font-semibold transition bg-green-600 text-white hover:bg-green-700"
          >
            Next Chapter → {getLocalizedField(nextChapter, i18n.language, 'title') || nextChapter.titleLv}
          </button>
        ) : (
          <Link
            to={`/courses/${documentId}`}
            className="px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            ✓ Back to Course
          </Link>
        )}
      </div>
    </div>
  )
}

// ChapterDetail.jsx — FULL CLEAN VERSION
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../../api/strapi'
import { mediaUrl } from '../../api/media'
import { useTranslation } from 'react-i18next'
import { getQuestionText, getLocalizedField } from '../../api/strapi'
import MediaDisplay from '../../components/MediaDisplay'

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
function getBlockFile(block) {
    return block.media?.file || block.file || block.mediaItems?.[0]?.file || null
  }

// ─── Resolve image src from a block (handles both new & old shape) ────────────
function resolveImageSrc(block) {
  if (block.media?.file?.url) return mediaUrl(block.media.file.url)   // ← YOUR ACTUAL SHAPE
  if (block.mediaItems?.[0]?.file?.url) return mediaUrl(block.mediaItems[0].file.url)
  if (block.file?.url) return mediaUrl(block.file.url)
  if (block.media?.url) return mediaUrl(block.media.url)
  if (block.url) return block.url
  return null
}

// ─── YouTube video ID extractor ───────────────────────────────────────────────
function getYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v') || null
  } catch { return null }
}

// ─── Interactive question card ────────────────────────────────────────────────
function QuestionCard({ question, onCorrect }) {
  const [selected, setSelected] = useState(null)
  const [locked, setLocked] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const handleAnswer = (answer) => {
    if (locked) return
    setSelected(answer)
    const isCorrect =
      String(answer).toLowerCase() === String(question.correctAnswer).toLowerCase()
    if (isCorrect) {
      setFeedback('correct')
      setLocked(true)
      onCorrect(question.id)
    } else {
      setFeedback('wrong')
    }
  }
  return (
    <div className={`rounded-xl border-2 p-5 transition-all ${
      feedback === 'correct'
        ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
        : feedback === 'wrong'
          ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
          : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
    }`}>
      <p className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        {question.text}
      </p>

      {/* Question media (image attached to a question block) */}
      {question.mediaItems?.length > 0 && (
        <MediaDisplay items={question.mediaItems} />
      )}

      {question.type === 'yes_no' && (
        <div className="flex gap-3">
          {['true', 'false'].map(val => (
            <button
              key={val}
              onClick={() => handleAnswer(val)}
              disabled={locked}
              className={`flex-1 py-2 rounded-lg border font-medium text-sm transition
                ${locked && val === String(question.correctAnswer)
                  ? 'bg-green-500 text-white border-green-500'
                  : selected === val && feedback === 'wrong'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                } disabled:cursor-not-allowed`}
              style={{
                color:
                  (locked && val === String(question.correctAnswer)) ||
                  (selected === val && feedback === 'wrong')
                    ? 'white'
                    : 'var(--text-primary)',
              }}
            >
              {val === 'true' ? '✓ Yes' : '✗ No'}
            </button>
          ))}
        </div>
      )}

      {question.type === 'multiple_choice' && (
        <div className="space-y-2">
          {question.options?.map(option => (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={locked}
              className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition
                ${locked && option === question.correctAnswer
                  ? 'bg-green-500 text-white border-green-500'
                  : selected === option && feedback === 'wrong'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                } disabled:cursor-not-allowed`}
              style={{
                color:
                  (locked && option === question.correctAnswer) ||
                  (selected === option && feedback === 'wrong')
                    ? 'white'
                    : 'var(--text-primary)',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {feedback === 'correct' && (
        <div className="mt-3 text-green-600 font-medium text-sm">✅ Correct!</div>
      )}
      {feedback === 'wrong' && (
        <div className="mt-3 text-red-600 font-medium text-sm">❌ Wrong, try again</div>
      )}
    </div>
  )
}

// ─── Block renderer (mirrors ChapterPreviewModal logic exactly) ───────────────
function BlockRenderer({ block, i, onCorrect, language }) {
  if (block.type === 'text') return (
    <div key={i} className="rounded-xl shadow p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
      <RichText content={block.content} />
    </div>
  )

  if (block.type === 'video') {
    const videoId = getYouTubeId(block.url)
    if (!videoId) return null
    return (
      <div key={i} className="aspect-video rounded-xl overflow-hidden shadow">
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

  if (block.type === 'question') return (
    <QuestionCard
      key={i}
      question={{
        id: block.id,
        text: block.content,
        type: block.questionType || 'yes_no',
        options: block.options?.length ? block.options : ['true', 'false'],
        correctAnswer: block.correctAnswer,
        mediaItems: block.mediaItems || [],
      }}
      onCorrect={onCorrect}
    />
  )

  if (block.type === 'bank_question') return (
    <QuestionCard
      key={i}
      question={{
        id: block.id,
        text: getQuestionText(block, language) || block.content,
        type: block.questionType || 'yes_no',
        options: block.options?.length ? block.options : ['true', 'false'],
        correctAnswer: block.correctAnswer,
        mediaItems: block.mediaItems || [],
      }}
      onCorrect={onCorrect}
    />
  )

  return null
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ChapterDetail() {
  const { documentId, chapterDocumentId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredIds, setAnsweredIds] = useState(new Set())
  const { i18n } = useTranslation()

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', chapterDocumentId],
    queryFn: () =>
      api.get(`/chapters/${chapterDocumentId}?populate=*`).then(r => {
        const data = r.data.data
        data?.blocks?.forEach((block, i) => {
          console.log(`BLOCK[${i}] type=${block.type}:`, JSON.stringify(block, null, 2))
        })
        return data
      }),
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

  const totalQuestions =
    chapter?.blocks?.filter(b => b.type === 'question' || b.type === 'bank_question')
      .length || 0
  const allCorrect = totalQuestions > 0 && correctCount >= totalQuestions

  useEffect(() => {
    setCorrectCount(0)
    setAnsweredIds(new Set())
  }, [chapterDocumentId])

  useEffect(() => {
    if (chapter?.documentId && totalQuestions === 0) {
      markSeenMutation.mutate(chapter.documentId)
    }
  }, [chapter?.documentId, totalQuestions])

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

  const hasBlocks = chapter?.blocks?.length > 0
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

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold text-blue-700">
          {getLocalizedField(chapter, i18n.language, 'title') || chapter?.title}
        </h1>
        {isSeen && (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
            ✓ Completed
          </span>
        )}
      </div>

      {/* ── Block-based content (new chapters) ── */}
      {hasBlocks && (
        <div className="space-y-6 mb-6">
          {chapter.blocks.map((block, i) => (
            <BlockRenderer
              key={i}
              block={block}
              i={i}
              onCorrect={handleCorrect}
              language={i18n.language}
            />
          ))}
        </div>
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
                  <figure key={i} className="rounded-xl overflow-hidden shadow">
                    <img src={src} alt={item.alternativeText || ''} className="w-full object-cover max-h-96" />
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
          <p className="text-4xl mb-3">📄</p>
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
            <p className="text-green-600 font-semibold text-sm text-center mt-3">
              🎉 Chapter complete!
            </p>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex justify-end mb-8">
        {nextChapter ? (
          <button
            onClick={() =>
              navigate(`/courses/${documentId}/chapters/${nextChapter.documentId}`)
            }
            className="px-6 py-3 rounded-xl font-semibold transition bg-green-600 text-white hover:bg-green-700"
          >
            Next Chapter → {nextChapter.title}
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

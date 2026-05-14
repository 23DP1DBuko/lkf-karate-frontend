import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../../api/strapi'
import { mediaUrl } from '../../api/media'
import { useTranslation } from 'react-i18next'
import { getQuestionText, getLocalizedField } from '../../api/strapi'

function RichText({ content }) {
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
            <p key={i} className="mb-4 leading-relaxed">
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

function MediaDisplay({ media }) {
  if (!media) return null
  const items = Array.isArray(media) ? media : [media]
  if (items.length === 0) return null
  return (
    <div className="space-y-4 mb-6">
      {items.map((item, i) => {
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
        if (item.mime?.startsWith('video/')) {
          return (
            <video key={i} controls className="w-full rounded-xl shadow mb-6">
              <source src={mediaUrl(item.url)} type={item.mime} />
            </video>
          )
        }
        return null
      })}
    </div>
  )
}

function QuestionCard({ question, onCorrect }) {
  const [selected, setSelected] = useState(null)
  const [locked, setLocked] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong'

  const handleAnswer = (answer) => {
    if (locked) return
    setSelected(answer)
    const isCorrect = String(answer).toLowerCase() === String(question.correctAnswer).toLowerCase()
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

      {question.media && (
        <MediaDisplay media={question.media} />
      )}

      {question.type === 'yes_no' && (
        <div className="flex gap-3">
          {['true', 'false'].map(val => (
            <button
              key={val}
              onClick={() => handleAnswer(val)}
              disabled={locked}
              className={`flex-1 py-2 rounded-lg border font-medium text-sm transition ${
                locked && val === String(question.correctAnswer)
                  ? 'bg-green-500 text-white border-green-500'
                  : selected === val && feedback === 'wrong'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
              } disabled:cursor-not-allowed`}
              style={{ color: (locked && val === String(question.correctAnswer)) || (selected === val && feedback === 'wrong') ? 'white' : 'var(--text-primary)' }}
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
              className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition ${
                locked && option === question.correctAnswer
                  ? 'bg-green-500 text-white border-green-500'
                  : selected === option && feedback === 'wrong'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
              } disabled:cursor-not-allowed`}
              style={{ color: (locked && option === question.correctAnswer) || (selected === option && feedback === 'wrong') ? 'white' : 'var(--text-primary)' }}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {feedback === 'correct' && (
        <div className="mt-3 text-green-600 font-medium text-sm">
          ✅ Correct!
        </div>
      )}
      {feedback === 'wrong' && (
        <div className="mt-3 text-red-600 font-medium text-sm">
          ❌ Wrong, try again
        </div>
      )}
    </div>
  )
}

export default function ChapterDetail() {
  const { documentId, chapterDocumentId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredIds, setAnsweredIds] = useState(new Set())
  const { t, i18n } = useTranslation()

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', chapterDocumentId],
    queryFn: () => api.get(`/chapters/${chapterDocumentId}?populate[0]=course&populate[1]=media&populate[2]=questions`).then(r => r.data.data)
  })
    
  const { data: allChapters } = useQuery({
    queryKey: ['chapters', documentId],
    queryFn: () => api.get(`/chapters?filters[course][documentId][$eq]=${documentId}&sort=order:asc`).then(r => r.data.data)
  })

  const { data: progressData } = useQuery({
    queryKey: ['chapter-progress'],
    queryFn: () => api.get('/chapter-progress').then(r => r.data.data)
  })

  const markSeenMutation = useMutation({
    mutationFn: (chapterId) => api.post('/chapter-progress/mark-seen', { chapterId }),
    onSuccess: () => queryClient.invalidateQueries(['chapter-progress'])
  })

  const isSeen = progressData?.some(p => p.chapter?.documentId === chapter?.documentId)
  const totalQuestions = chapter?.blocks?.filter(
    b => b.type === 'question' || b.type === 'bank_question'
  ).length || 0
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
  // Find next chapter
  const currentIndex = allChapters?.findIndex(c => c.documentId === chapterDocumentId) ?? -1
  const nextChapter = allChapters?.[currentIndex + 1]

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: 'var(--text-secondary)' }}>Loading chapter...</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to={`/courses/${documentId}`}
        className="text-blue-600 hover:underline text-sm mb-4 block"
      >
        ← Back to Course
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold text-blue-700">{getLocalizedField(chapter, i18n.language, 'title') || chapter?.title}</h1>
        {isSeen && (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
            ✓ Completed
          </span>
        )}
      </div>

      {chapter?.blocks?.length > 0 ? (
        <div className="space-y-6 mb-6">
          {chapter.blocks.map((block, i) => {
            if (block.type === 'text') return (
              <div key={i} className="rounded-xl shadow p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="prose prose-slate max-w-none"
                  style={{ color: 'var(--text-primary)' }}
                  dangerouslySetInnerHTML={{ __html: block.content }} />
              </div>
            )
            if (block.type === 'video') {
              const videoId = (() => {
                try {
                  const u = new URL(block.url)
                  return u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v')
                } catch { return null }
              })()
              if (!videoId) return null
              return (
                <div key={i} className="aspect-video rounded-xl overflow-hidden shadow">
                  <iframe src={`https://www.youtube.com/embed/${videoId}`}
                    className="w-full h-full" allowFullScreen title="Video" />
                </div>
              )
            }
            if (block.type === 'image_url') return (
              <figure key={i} className="rounded-xl overflow-hidden shadow">
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
            if (block.type === 'question') return (
              <QuestionCard
                key={i}
                question={{
                  id: block.id,
                  text: block.content,
                  type: block.questionType || 'yes_no',
                  options: block.options?.length ? block.options : ['true', 'false'],
                  correctAnswer: block.correctAnswer,
                  media: null,
                }}
                onCorrect={handleCorrect}
              />
            )
            if (block.type === 'bank_question') return (
              <QuestionCard
                key={i}
                question={{
                  id: block.id,
                  text: getQuestionText(block, i18n.language) || block.content,
                  type: block.questionType || 'yes_no',
                  options: block.options?.length ? block.options : ['true', 'false'],
                  correctAnswer: block.correctAnswer,
                  media: null,
                }}
                onCorrect={handleCorrect}
              />
            )
            if (block.type === 'image') return (
              <figure key={i} className="rounded-xl overflow-hidden shadow">
                <img
                  src={block.media?.url ? mediaUrl(block.media.url) : block.url}
                  alt={block.caption || ''}
                  className="w-full object-cover max-h-96"
                />
                {block.caption && (
                  <figcaption className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )
            return null
          })}
        </div>
      ) : (
        <>
          <YouTubeEmbed url={chapter?.videoUrl} />
          <MediaDisplay media={chapter?.media} />
          <div className="rounded-xl shadow p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <RichText content={chapter?.content} />
          </div>
        </>
      )}

      {/* Progress counter — shows after all content */}
      {totalQuestions > 0 && (
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
            {correctCount} / {totalQuestions} questions answered correctly
          </p>
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
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

      {/* Next Chapter Button */}
      {nextChapter && (
        <div className="flex justify-end mb-8">
          <button
            onClick={() => navigate(`/courses/${documentId}/chapters/${nextChapter.documentId}`)}
            className="px-6 py-3 rounded-xl font-semibold transition bg-green-600 text-white hover:bg-green-700"
          >
            Next Chapter → {nextChapter.title}
          </button>
        </div>
      )}

      {!nextChapter && (
        <div className="flex justify-end mb-8">
          <Link
            to={`/courses/${documentId}`}
            className="px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            ✓ Back to Course
          </Link>
        </div>
      )}
    </div>
  )
}

// ChapterBlocks.jsx — renders imported chapter blocks as one continuous,
// readable document (paragraphs flow together, subheadings are bold, lists and
// figures sit inline with natural spacing). Used by ChapterDetail (interactive
// questions via onCorrect) and ChapterPreviewModal (read-only when omitted).
import { useState } from 'react'
import { mediaUrl } from '../api/media'
import { getQuestionText } from '../api/strapi'
import MediaDisplay from './MediaDisplay'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

// ─── Text helpers ─────────────────────────────────────────────────────────────

function plainText(html) {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// Detect subsection titles stored as plain <p> blocks by the PDF parser,
// e.g. "2.1 Referees and Judges", "10.7 Disqualification in Round-robin
// competition." or short ALL-CAPS lines like "GENERAL PROVISIONS".
function isHeadingText(html) {
  const t = plainText(html)
  if (!t) return false
  // numbered subsections (decimal dots): 2.1, 10.7, 3.2.1 …
  if (/^\d+(\.\d+)+\s+\S/.test(t)) return t.length <= 70
  // short ALL-CAPS title
  if (/^[A-Z][A-Z0-9\s\-/&()]+$/.test(t)) return t.length >= 4 && t.length <= 60
  return false
}

function getBlockFile(block) {
  return block.media?.file || block.file || block.mediaItems?.[0]?.file || null
}

// Resolve image src from a block (handles both new & old shape)
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

// Slate/Strapi rich-text JSON → HTML (fallback for non-PDF blocks)
function slateToHtml(content) {
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      const text = block.children?.map(c => c.text || '').join('') || ''
      if (block.type === 'heading') return `<h3>${text}</h3>`
      return `<p>${text}</p>`
    })
    .join('\n')
}

// ─── Interactive question card ────────────────────────────────────────────────

// Aka/Ao video player — YouTube URLs embed, local files play via <video>.
function AkaVideo({ url, className = '' }) {
  const vid = getYouTubeId(url)
  if (vid) {
    return (
      <div className={`w-full aspect-video overflow-hidden bg-black rounded-lg ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${vid}`}
          className="w-full h-full"
          allowFullScreen
          title="Video"
        />
      </div>
    )
  }
  const src = mediaUrl(url)
  if (!src) {
    return (
      <div className={`w-full aspect-video flex items-center justify-center bg-black/80 rounded-lg ${className}`}>
        <span className="text-xs text-white/60">No video</span>
      </div>
    )
  }
  return (
    <video controls preload="metadata" className={`w-full aspect-video bg-black rounded-lg ${className}`}>
      <source src={src} />
    </video>
  )
}

const AKA_TONE = '#dc2626'
const AO_TONE = '#2563eb'

function QuestionCard({ question, onCorrect }) {
  const isMulti =
    question.type === 'multiple_choice' &&
    Array.isArray(question.correctAnswers) &&
    question.correctAnswers.length > 0

  const [selected, setSelected] = useState(isMulti ? [] : null)
  const [locked, setLocked] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const markCorrect = () => {
    setFeedback('correct')
    setLocked(true)
    onCorrect(question.id)
  }

  const handleAnswer = (answer) => {
    if (locked) return
    setSelected(answer)
    // When no correct answer is stored (e.g. open-text questions), any non-empty
    // answer counts as correct — otherwise the question could never be marked
    // right and chapter progress would dead-end (BUG-007).
    const hasExpected =
      question.correctAnswer !== undefined && question.correctAnswer !== null
    const isCorrect = hasExpected
      ? String(answer).toLowerCase() === String(question.correctAnswer).toLowerCase()
      : String(answer).trim() !== ''
    if (isCorrect) markCorrect()
    else setFeedback('wrong')
  }

  const toggleMulti = (option) => {
    if (locked) return
    setSelected(prev =>
      prev.includes(option)
        ? prev.filter(v => v !== option)
        : [...prev, option]
    )
    setFeedback(null)
  }

  const submitMulti = () => {
    if (locked || selected.length === 0) return
    const expected = question.correctAnswers.map(String).sort()
    const got = selected.map(String).sort()
    if (got.length === expected.length && got.every((v, i) => v === expected[i])) {
      markCorrect()
    } else {
      setFeedback('wrong')
    }
  }

  const isSelectedSingle = (val) => selected === val && feedback === 'wrong'

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
                  : isSelectedSingle(val)
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                } disabled:cursor-not-allowed`}
              style={{
                color:
                  (locked && val === String(question.correctAnswer)) ||
                  isSelectedSingle(val)
                    ? 'white'
                    : 'var(--text-primary)',
              }}
            >
              {val === 'true' ? '✓ Yes' : '✗ No'}
            </button>
          ))}
        </div>
      )}

      {(question.type === 'single_choice' ||
        (question.type === 'multiple_choice' && !isMulti)) && (
        <div className="space-y-2">
          {question.options?.map(option => (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={locked}
              className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition
                ${locked && option === question.correctAnswer
                  ? 'bg-green-500 text-white border-green-500'
                  : isSelectedSingle(option)
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                } disabled:cursor-not-allowed`}
              style={{
                color:
                  (locked && option === question.correctAnswer) ||
                  isSelectedSingle(option)
                    ? 'white'
                    : 'var(--text-primary)',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === 'multiple_choice' && isMulti && (
        <div className="space-y-2">
          {question.options?.map(option => {
            const isOn = selected.includes(option)
            // Wrong attempt: tint the picked options red (like single-choice)
            const isWrongPick = feedback === 'wrong' && isOn
            return (
              <button
                key={option}
                onClick={() => toggleMulti(option)}
                disabled={locked}
                className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition
                  ${locked && question.correctAnswers.includes(option)
                    ? 'bg-green-500 text-white border-green-500'
                    : isWrongPick
                      ? 'bg-red-500 text-white border-red-500'
                      : isOn
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                  } disabled:cursor-not-allowed`}
                style={{
                  color:
                    (locked && question.correctAnswers.includes(option)) ||
                    isOn
                      ? 'white'
                      : 'var(--text-primary)',
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] ${
                      isOn ? 'border-white bg-white/20' : 'border-current opacity-60'
                    }`}
                  >
                    {isOn ? '✓' : ''}
                  </span>
                  {option}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={submitMulti}
            disabled={locked || selected.length === 0}
            className="mt-2 px-4 py-2 rounded-lg border font-medium text-sm transition
              border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Answer
          </button>
        </div>
      )}

      {question.type === 'aka_ao' && (
        <div className="flex flex-col gap-4">
          {question.videoAoUrl && question.videoAkaUrl ? (
            /* Two videos — AKA card + AO card, tap to answer */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { tone: 'aka', url: question.videoAkaUrl, label: 'AKA', color: AKA_TONE },
                { tone: 'ao', url: question.videoAoUrl, label: 'AO', color: AO_TONE },
              ].map(({ tone, url, label, color }) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => handleAnswer(tone)}
                  disabled={locked}
                  className={`rounded-xl overflow-hidden border-2 text-left transition
                    ${locked && String(question.correctAnswer) === tone
                      ? 'border-green-500'
                      : isSelectedSingle(tone)
                        ? 'border-red-500'
                        : 'border-gray-300 hover:border-blue-400 dark:border-gray-600'
                    } disabled:cursor-not-allowed`}
                >
                  <AkaVideo url={url} />
                  <div
                    className="px-3 py-2 text-sm font-bold"
                    style={{ color }}
                  >
                    {label}
                  </div>
                </button>
              ))}
            </div>
          ) : question.videoAkaUrl ? (
            /* One video — centered, AO left + AKA right buttons */
            <>
              <AkaVideo url={question.videoAkaUrl} />
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleAnswer('ao')}
                  disabled={locked}
                  className={`flex-1 py-3 rounded-lg border-2 font-bold text-sm transition
                    ${locked && String(question.correctAnswer) === 'ao'
                      ? 'bg-green-500 text-white border-green-500'
                      : isSelectedSingle('ao')
                        ? 'bg-red-500 text-white border-red-500'
                        : 'border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    } disabled:cursor-not-allowed`}
                >
                  AO
                </button>
                <button
                  type="button"
                  onClick={() => handleAnswer('aka')}
                  disabled={locked}
                  className={`flex-1 py-3 rounded-lg border-2 font-bold text-sm transition
                    ${locked && String(question.correctAnswer) === 'aka'
                      ? 'bg-green-500 text-white border-green-500'
                      : isSelectedSingle('aka')
                        ? 'bg-red-500 text-white border-red-500'
                        : 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    } disabled:cursor-not-allowed`}
                >
                  AKA
                </button>
              </div>
            </>
          ) : (
            /* No videos configured — keep answerable via AKA/AO buttons */
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleAnswer('ao')}
                disabled={locked}
                className={`flex-1 py-3 rounded-lg border-2 font-bold text-sm transition
                  ${locked && String(question.correctAnswer) === 'ao'
                    ? 'bg-green-500 text-white border-green-500'
                    : isSelectedSingle('ao')
                      ? 'bg-red-500 text-white border-red-500'
                      : 'border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  } disabled:cursor-not-allowed`}
              >
                AO
              </button>
              <button
                type="button"
                onClick={() => handleAnswer('aka')}
                disabled={locked}
                className={`flex-1 py-3 rounded-lg border-2 font-bold text-sm transition
                  ${locked && String(question.correctAnswer) === 'aka'
                    ? 'bg-green-500 text-white border-green-500'
                    : isSelectedSingle('aka')
                      ? 'bg-red-500 text-white border-red-500'
                      : 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                  } disabled:cursor-not-allowed`}
              >
                AKA
              </button>
            </div>
          )}
        </div>
      )}

      {/* BUG-007: fallback so unknown question types remain answerable */}
      {question.type !== 'yes_no' &&
        question.type !== 'multiple_choice' &&
        question.type !== 'single_choice' &&
        question.type !== 'aka_ao' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            This question type is not supported yet — answer below as free text.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={selected || ''}
              onChange={(e) => setSelected(e.target.value)}
              disabled={locked}
              placeholder="Type your answer..."
              className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-card)',
              }}
            />
            <button
              type="button"
              onClick={() => handleAnswer(selected)}
              disabled={locked || !String(selected || '').trim()}
              className="px-4 py-2 rounded-lg border font-medium text-sm transition
                border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Answer
            </button>
          </div>
        </div>
      )}

      {feedback === 'correct' && (
        <div className="mt-3 text-green-600 font-medium text-sm inline-flex items-center gap-1.5">
          <CheckCircleIcon className="w-4 h-4" />
          Correct!
        </div>
      )}
      {feedback === 'wrong' && (
        <div className="mt-3 text-red-600 font-medium text-sm inline-flex items-center gap-1.5">
          <XCircleIcon className="w-4 h-4" />
          Wrong, try again
        </div>
      )}
    </div>
  )
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function TableBlock({ block }) {
  const { headers = [], rows = [], caption } = block.content || {}
  if (!headers.length && !rows.length) return null
  return (
    <div
      className="my-6 overflow-x-auto rounded-xl border"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2.5 text-left font-semibold border-b whitespace-nowrap"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b" style={{ borderColor: 'var(--border)' }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 align-top" style={{ color: 'var(--text-secondary)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(caption || block.needsReview) && (
        <div
          className="flex items-center gap-2 px-3 py-2 border-t"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
        >
          {caption && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{caption}</p>}
          {block.needsReview && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">⚠ needs review</span>
          )}
        </div>
      )}
    </div>
  )
}

function ListBlock({ block }) {
  return (
    <ul
      className="list-disc pl-6 my-5 space-y-2 text-[15px] leading-relaxed"
      style={{ color: 'var(--text-primary)' }}
    >
      {(block.items || []).map((item, i) => (
        <li key={i}>{item.replace(/^[•▪◦–—]\s*/, '')}</li>
      ))}
    </ul>
  )
}

function ImageFigure({ block }) {
  const file = getBlockFile(block)
  const src = resolveImageSrc(block)
  if (!src) return null

  if (file?.mime?.startsWith('video/')) {
    return (
      <figure className="my-8">
        <video controls className="w-full max-h-96 rounded-xl bg-black">
          <source src={src} type={file.mime} />
        </video>
        {block.caption && (
          <figcaption className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className="my-8">
      <div
        className="flex items-center justify-center rounded-xl border p-4 sm:p-6"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
      >
        <img
          src={src}
          alt={block.caption || block.alt || file?.alternativeText || ''}
          loading="lazy"
          className="max-h-[28rem] w-auto max-w-full rounded-lg object-contain"
        />
      </div>
      {block.caption && (
        <figcaption className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}

function NoteBlock({ block }) {
  return (
    <div
      className="my-6 rounded-lg px-4 py-3 border"
      style={{
        backgroundColor: 'rgba(59,130,246,0.06)',
        borderColor: 'rgba(59,130,246,0.15)',
      }}
    >
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{block.content}</p>
    </div>
  )
}

function QuestionBlock({ block, language, onCorrect }) {
  const question = {
    id: block.id,
    text: getQuestionText(block, language) || block.content,
    type: block.questionType || 'yes_no',
    options: block.options?.length ? block.options : ['true', 'false'],
    correctAnswer: block.correctAnswer,
    correctAnswers:
      Array.isArray(block.correctAnswers) ? block.correctAnswers : [],
    videoAkaUrl: block.videoAkaUrl || '',
    videoAoUrl: block.videoAoUrl || '',
    mediaItems: block.mediaItems || [],
  }

  const multiCorrect =
    Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
    ? question.correctAnswers.join(', ')
    : question.correctAnswer

  const akaAoLabel =
    question.correctAnswer === 'ao' ? 'AO' : question.correctAnswer === 'aka' ? 'AKA' : question.correctAnswer

  // Interactive mode (student view)
  if (typeof onCorrect === 'function') {
    return <QuestionCard question={question} onCorrect={onCorrect} />
  }

  // Read-only mode (admin preview)
  return (
    <div
      className="my-6 rounded-xl p-4 border"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        <span className="text-blue-600 mr-1">Q.</span>
        {question.text}
      </p>
      {question.type === 'yes_no' && (
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
      {(question.type === 'multiple_choice' || question.type === 'single_choice') && (
        <div className="space-y-2">
          {question.options.filter(o => String(o).trim()).map((opt, j) => (
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
      {question.type === 'aka_ao' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[question.videoAkaUrl, question.videoAoUrl].filter(Boolean).map((url, j) => (
            <div key={j} className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <AkaVideo url={url} />
              <p className="px-2 py-1 text-xs font-bold" style={{ color: j === 0 ? AKA_TONE : AO_TONE }}>
                {j === 0 ? 'AKA' : 'AO'}
              </p>
            </div>
          ))}
        </div>
      )}
      {question.type !== 'open_text' && (
        <p className="text-xs mt-2 text-green-600">✓ Correct: {multiCorrect}{question.type === 'aka_ao' ? ` (${akaAoLabel})` : ''}</p>
      )}
    </div>
  )
}

// ─── Main renderer: groups consecutive paragraphs into one prose flow ─────────

export default function ChapterBlocks({ blocks, language, onCorrect }) {
  if (!blocks?.length) return null

  const out = []
  let proseBuf = []

  const flushProse = () => {
    if (!proseBuf.length) return
    out.push(
      <div
        key={`prose-${out.length}`}
        className="prose prose-slate max-w-none text-[15px]"
        style={{ color: 'var(--text-primary)' }}
        dangerouslySetInnerHTML={{ __html: proseBuf.join('\n') }}
      />
    )
    proseBuf = []
  }

  blocks.forEach((block, i) => {
    if (block.type === 'text') {
      const html =
        typeof block.content === 'string'
          ? block.content
          : slateToHtml(block.content)
      if (isHeadingText(html)) {
        flushProse()
        out.push(
          <h3
            key={`h-${i}`}
            className="text-lg sm:text-xl font-bold mt-10 mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            {plainText(html)}
          </h3>
        )
      } else if (html.trim()) {
        proseBuf.push(html)
      }
      return
    }

    flushProse()
    switch (block.type) {
      case 'list':
        out.push(<ListBlock key={i} block={block} />)
        break
      case 'table':
        out.push(<TableBlock key={i} block={block} />)
        break
      case 'image':
      case 'image_url':
        out.push(<ImageFigure key={i} block={block} />)
        break
      case 'video': {
        const videoId = getYouTubeId(block.url)
        if (videoId) {
          out.push(
            <div key={i} className="my-6 aspect-video rounded-xl overflow-hidden shadow-sm">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allowFullScreen
                title="Video"
              />
            </div>
          )
        }
        break
      }
      case 'note':
        out.push(<NoteBlock key={i} block={block} />)
        break
      case 'question':
      case 'bank_question':
        out.push(<QuestionBlock key={i} block={block} language={language} onCorrect={onCorrect} />)
        break
      default:
        break
    }
  })

  flushProse()
  return <div className="mb-8">{out}</div>
}

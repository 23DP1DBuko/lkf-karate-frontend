// AkaAoQuestion.jsx — Aka / Ao video question component
//
// Shows one or two videos; the student answers whether the action is AKA or AO.
//   • Two videos: side-by-side cards, one labeled AKA (red), the other AO
//     (blue). Tapping a video card selects that answer.
//   • One video: video is centered, with the AO button on the left and the
//     AKA button on the right below it (as requested).
//
// Props:
//   questionText  — the question heading
//   videoAkaUrl   — AKA video URL (YouTube or direct file URL), also hosts the
//                   single video when videoAoUrl is empty
//   videoAoUrl    — AO video URL; empty → single-video layout
//   selectedValue — "aka" | "ao" | null
//   onAnswer      — called with "aka" | "ao"
//   onSubmit      — called when the submit button is clicked
//   canSubmit     — enable the submit button
//   isSubmitting  — loading state on the submit button
//   submitLabel   — custom label for the submit button
//   akaLabel      — label for the AKA option (default "AKA")
//   aoLabel       — label for the AO option (default "AO")
//   showHeading   — render the question heading (default true)
//   showSubmit    — render the submit button (default true)

import { CheckIcon } from '@heroicons/react/24/outline'
import { mediaUrl } from '../../api/media'

function getYouTubeEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed${u.pathname}`
    const v = u.searchParams.get('v')
    return v ? `https://www.youtube.com/embed/${v}` : null
  } catch {
    return null
  }
}

// Render a single video — YouTube embeds as an iframe, anything else as a
// <video> element (local uploads from Strapi resolve through mediaUrl).
function VideoPlayer({ url, className = '' }) {
  const embed = getYouTubeEmbedUrl(url)
  const src = mediaUrl(url)

  if (embed) {
    return (
      <div className={`w-full aspect-video overflow-hidden bg-black ${className}`}>
        <iframe
          className="w-full h-full"
          src={embed}
          title="Video"
          allowFullScreen
        />
      </div>
    )
  }

  if (!src) {
    return (
      <div className={`w-full aspect-video flex items-center justify-center bg-black/80 ${className}`}>
        <span className="text-xs text-white/60">No video</span>
      </div>
    )
  }

  return (
    <video controls preload="metadata" className={`w-full aspect-video bg-black ${className}`}>
      <source src={src} />
    </video>
  )
}

const TONE = {
  aka: { label: 'AKA', accent: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.6)' },
  ao: { label: 'AO', accent: '#2563eb', bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.6)' },
}

function AnswerButton({ tone, label, selected, onSelect, disabled }) {
  const c = TONE[tone]
  const isActive = selected === tone
  return (
    <button
      type="button"
      onClick={() => onSelect(tone)}
      disabled={disabled}
      style={{
        backgroundColor: isActive ? c.accent : 'var(--bg-card)',
        borderColor: isActive ? c.accent : c.border,
        color: isActive ? '#ffffff' : c.accent,
        boxShadow: isActive ? `0 10px 15px -3px ${c.border}` : 'none',
      }}
      className={`
        flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl
        border-2 font-bold text-lg tracking-wide
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        active:scale-[0.98]
        ${isActive ? '' : 'hover:shadow-md hover:-translate-y-0.5'}
      `}
      aria-pressed={isActive}
    >
      {isActive && <CheckIcon className="w-5 h-5 flex-shrink-0" />}
      {label}
    </button>
  )
}

export default function AkaAoQuestion({
  questionText,
  videoAkaUrl,
  videoAoUrl,
  selectedValue,
  onAnswer,
  onSubmit,
  canSubmit,
  isSubmitting = false,
  submitLabel = 'Submit Answer',
  akaLabel = 'AKA',
  aoLabel = 'AO',
  showHeading = true,
  showSubmit = true,
}) {
  const twoVideos = Boolean(videoAoUrl && videoAkaUrl)
  const singleVideo = !twoVideos && Boolean(videoAkaUrl)
  const hasSelection = selectedValue === 'aka' || selectedValue === 'ao'
  const submitEnabled = canSubmit !== undefined ? canSubmit : hasSelection

  const handleSelect = (val) => {
    if (onAnswer) onAnswer(val)
  }

  return (
    <div className={`flex flex-col ${showSubmit ? 'gap-8' : 'gap-4'}`}>
      {/* Question heading */}
      {showHeading && (
        <h2
          className="text-xl md:text-3xl font-semibold leading-snug tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {questionText}
        </h2>
      )}

      {twoVideos ? (
        /* ── Two videos: AKA card + AO card, tap to answer ─────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { tone: 'aka', url: videoAkaUrl, label: akaLabel },
            { tone: 'ao', url: videoAoUrl, label: aoLabel },
          ].map(({ tone, url, label }) => {
            const c = TONE[tone]
            const isActive = selectedValue === tone
            return (
              <button
                key={tone}
                type="button"
                onClick={() => handleSelect(tone)}
                aria-pressed={isActive}
                className={`
                  relative rounded-2xl overflow-hidden border-2 text-left
                  transition-all duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  active:scale-[0.98]
                  ${isActive ? 'shadow-lg' : 'hover:shadow-md hover:-translate-y-0.5'}
                `}
                style={{
                  borderColor: isActive ? c.accent : 'var(--border)',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                <VideoPlayer url={url} />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-bold" style={{ color: c.accent }}>
                    {label}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      isActive ? 'border-transparent' : ''
                    }`}
                    style={{
                      backgroundColor: isActive ? c.accent : 'transparent',
                      borderColor: isActive ? c.accent : 'var(--border)',
                    }}
                  >
                    {isActive && <CheckIcon className="w-3 h-3 text-white" />}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : singleVideo ? (
        /* ── One video: centered, AO left + AKA right buttons below ────── */
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <VideoPlayer url={videoAkaUrl} />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <AnswerButton tone="ao" label={aoLabel} selected={selectedValue} onSelect={handleSelect} />
            <AnswerButton tone="aka" label={akaLabel} selected={selectedValue} onSelect={handleSelect} />
          </div>
        </div>
      ) : (
        /* ── No video configured yet — keep the question answerable ────── */
        <div className="rounded-2xl border-2 border-dashed p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No video attached to this question yet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <AnswerButton tone="ao" label={aoLabel} selected={selectedValue} onSelect={handleSelect} />
            <AnswerButton tone="aka" label={akaLabel} selected={selectedValue} onSelect={handleSelect} />
          </div>
        </div>
      )}

      {/* Submit button */}
      {showSubmit && (
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => onSubmit?.()}
          disabled={!submitEnabled || isSubmitting}
          style={{
            backgroundColor: submitEnabled && !isSubmitting ? '#2563eb' : 'var(--bg-secondary)',
            color: submitEnabled && !isSubmitting ? '#ffffff' : 'var(--text-muted)',
            boxShadow: submitEnabled && !isSubmitting ? '0 10px 15px -3px rgba(37, 99, 235, 0.2)' : 'none',
            cursor: submitEnabled && !isSubmitting ? 'pointer' : 'not-allowed',
          }}
          className={`
            w-full sm:w-auto min-w-[200px] px-10 py-3.5 rounded-2xl
            text-base font-semibold tracking-wide
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            active:scale-[0.98]
            ${submitEnabled && !isSubmitting ? 'hover:bg-blue-700 hover:shadow-xl' : ''}
          `}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting…
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
      )}
    </div>
  )
}

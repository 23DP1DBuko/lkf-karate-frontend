// ExamQuestionView.jsx — Master shell layout for question-level exam views
//
// Props:
//   currentQuestion  — 1-based index of the current question
//   totalQuestions   — total number of questions
//   hasImage         — whether to render the image pane
//   imageSrc         — source URL for the image
//   imageAlt         — alt text for the image
//   canGoBack        — show the "← Back" link
//   onBack           — callback when back is clicked
//   children         — the question sub-component rendered in the content slot

import { ChevronLeftIcon } from '@heroicons/react/24/outline'

export default function ExamQuestionView({
  currentQuestion,
  totalQuestions,
  hasImage = false,
  imageSrc,
  imageAlt = '',
  canGoBack = false,
  onBack,
  children,
}) {
  // ── Meta bar: question count + optional back link ──────────────────────
  const metaBar = (
    <div className="flex items-center gap-3 mb-6 min-h-[28px]">
      {canGoBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium transition-colors duration-200 hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back
        </button>
      ) : (
        /* invisible placeholder preserves the layout height when back is hidden */
        <span className="inline-flex items-center gap-1 text-sm opacity-0 pointer-events-none select-none">
          <ChevronLeftIcon className="w-4 h-4" />
          Back
        </span>
      )}

      <span className="ml-auto text-sm font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Question{' '}
        <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
          {currentQuestion}
        </span>{' '}
        of {totalQuestions}
      </span>
    </div>
  )

  // ── Content pane (shared between layouts) ──────────────────────────────
  const contentPane = (
    <div className="flex flex-col justify-center min-h-screen p-6 md:p-12">
      <div className="w-full max-w-2xl mx-auto">
        {metaBar}
        {children}
      </div>
    </div>
  )

  // ── Image pane ─────────────────────────────────────────────────────────
  const imagePane = imageSrc ? (
    <div className="h-[35vh] md:h-screen overflow-hidden">
      <img
        src={imageSrc}
        alt={imageAlt}
        className="w-full h-full object-cover md:object-contain md:bg-slate-50 dark:md:bg-slate-900"
      />
    </div>
  ) : null

  // ── Desktop: with image ────────────────────────────────────────────────
  if (hasImage && imageSrc) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Left — image */}
        <div className="hidden md:block h-screen sticky top-0 overflow-hidden bg-slate-50 dark:bg-slate-900">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="w-full h-full object-contain p-4"
          />
        </div>

        {/* Mobile image — stacked (hidden on md+) */}
        <div className="block md:hidden">
          {imagePane}
        </div>

        {/* Right — content */}
        {contentPane}
      </div>
    )
  }

  // ── Desktop: without image (or image src missing) ───────────────────────
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      {imageSrc && (
        <div className="block md:hidden">
          {imagePane}
        </div>
      )}
      {contentPane}
    </div>
  )
}

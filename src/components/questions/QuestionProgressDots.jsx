// QuestionProgressDots.jsx — Clickable progress dots for navigating questions
//
// Props:
//   totalQuestions — total number of questions
//   currentIndex   — 0-based index of the current question
//   answers        — object mapping question IDs to their answers
//   questions      — array of question objects (with .id)
//   onJump         — called with the target index when a dot is clicked

export default function QuestionProgressDots({
  totalQuestions,
  currentIndex,
  answers = {},
  questions = [],
  onJump,
}) {
  if (totalQuestions < 2) return null

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 mb-8" aria-label="Question progress">
      {questions.map((q, i) => {
        const isCurrent = i === currentIndex
        const isAnswered = !!answers[q.id]

        let dotStyle = {}
        let className = ''

        if (isCurrent) {
          // Current question — filled brand color, slightly larger
          className =
            'w-3.5 h-3.5 rounded-full transition-all duration-200 ease-out cursor-pointer ' +
            'ring-2 ring-offset-2 ring-blue-500/50 ' +
            'hover:scale-125 active:scale-90'
          dotStyle = { backgroundColor: '#2563eb' } // blue-600
        } else if (isAnswered) {
          // Answered — filled green
          className =
            'w-3 h-3 rounded-full transition-all duration-200 ease-out cursor-pointer ' +
            'hover:scale-125 active:scale-90'
          dotStyle = { backgroundColor: '#059669' } // emerald-600
        } else {
          // Unanswered — outlined with border
          className =
            'w-3 h-3 rounded-full transition-all duration-200 ease-out cursor-pointer ' +
            'border-2 hover:scale-125 active:scale-90'
          dotStyle = { borderColor: 'var(--border)', backgroundColor: 'transparent' }
        }

        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onJump?.(i)}
            className={className}
            style={dotStyle}
            aria-label={`Go to question ${i + 1}${isAnswered ? ' (answered)' : ' (unanswered)'}`}
            aria-current={isCurrent ? 'step' : undefined}
          />
        )
      })}
    </nav>
  )
}

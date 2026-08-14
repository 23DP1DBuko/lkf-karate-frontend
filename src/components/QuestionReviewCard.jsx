import Card from './Card'
import { getLocalizedField } from '../api/strapi'
import { formatAnswerValue } from '../utils/attempts'

/**
 * Shared question review card used by both the student Results page
 * and the admin Exam Results review page.
 *
 * Props:
 *   question     — the question object (with textLv/Ru/En, type, etc.)
 *   index        — 1-based question number
 *   userAnswer   — the student's submitted answer
 *   correctAnswer — the correct answer value
 *   isCorrect    — boolean
 *   isOpenText   — boolean
 *   language     — current i18n language code for localized text
 *   labels       — object with display labels:
 *     { correctChoice, yourChoice, openTextNote }
 *   pillColor    — optional override for the pill (number indicator) color
 *                  classes. If not set, defaults to orange for open text,
 *                  green for correct, red for incorrect.
 *   renderExtra  — optional function (question) => JSX for additional
 *                  content below the answer row (e.g. grading buttons)
 *   t            — i18n translate function (required for formatAnswerValue)
 */
export default function QuestionReviewCard({
  question,
  index,
  userAnswer,
  correctAnswer,
  isCorrect,
  isOpenText,
  language = 'lv',
  labels = {},
  pillColor: pillColorOverride,
  renderExtra,
  t = (key) => key,
}) {
  const pillColor = pillColorOverride || (isOpenText
    ? 'bg-orange-100 text-orange-700'
    : isCorrect
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700')

  const answerColor = isCorrect ? 'text-green-600' : 'text-red-600'

  // Multi-select multiple choice stores the expected set in correctAnswers;
  // every other type uses the single correctAnswer string.
  const displayCorrect =
    question?.type === 'multiple_choice' &&
    Array.isArray(question.correctAnswers) &&
    question.correctAnswers.length > 0
      ? question.correctAnswers
      : correctAnswer

  return (
    <Card className="rounded-2xl shadow-lg p-5 border">
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 mt-1 flex h-9 w-9 items-center justify-center rounded-full font-semibold ${pillColor}`}
        >
          {index}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-base sm:text-lg font-semibold leading-relaxed"
            style={{ color: 'var(--text-primary)' }}
          >
            {getLocalizedField(question, language, 'text') || question.textLv}
          </p>

          {(question.type === 'multiple_choice' ||
            question.type === 'single_choice' ||
            question.type === 'yes_no' ||
            question.type === 'aka_ao') && (
            <>
              <p className={`mt-2 text-sm sm:text-base font-semibold ${answerColor}`}>
                {labels.correctChoice || 'Correct answer'}:{' '}
                {formatAnswerValue(displayCorrect, question, t)}
              </p>

              {!isCorrect && userAnswer !== undefined && (
                <p
                  className="mt-1 text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {labels.yourChoice || 'Your answer'}:{' '}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatAnswerValue(userAnswer, question, t)}
                  </span>
                </p>
              )}

              {isCorrect && (
                <p className="mt-2 text-sm text-green-600 font-medium">
                  ✓ {labels.correct || 'Correct'}
                </p>
              )}

              {!isCorrect && userAnswer === undefined && (
                <p className="mt-2 text-sm text-red-600 font-medium">
                  ✗ {labels.incorrect || 'Incorrect'}
                </p>
              )}
            </>
          )}

          {isOpenText && (
            <div className="space-y-2 mt-2">
              <div
                className="rounded-xl p-3"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                  {labels.yourChoice || 'Student answer'}:
                </p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {userAnswer || 'No answer provided'}
                </p>
              </div>

              {/* Extra content slot for admin grading controls */}
              {renderExtra && renderExtra(question)}

              {labels.openTextNote && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {labels.openTextNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

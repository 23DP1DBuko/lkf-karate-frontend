import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function ExamResult() {
  const { t } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()

  if (!state) {
    navigate('/courses')
    return null
  }

  const { score, passed, correct, total, showResults, resultsReleased } = state
  if (!showResults && !resultsReleased) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8 max-w-md w-full text-center" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="text-5xl md:text-6xl mb-4">📋</div>
          <h1 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('examResult.submitted')}</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {t('examResult.resultsAnnounced')}
          </p>
          <button
            onClick={() => navigate('/courses')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 w-full"
          >
            {t('examResult.backToCourses')}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="rounded-2xl shadow-lg p-6 md:p-8 max-w-md w-full text-center relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
        {/* Color accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${passed ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-rose-400 to-red-500'}`} />

        <div className={`text-5xl md:text-6xl mb-4 mt-2`}>
          {passed ? '🎉' : '😔'}
        </div>
        <h1 className="text-xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {passed ? t('examResult.congratulations') : t('examResult.notPassed')}
        </h1>
        <p className="text-sm md:text-base mb-5" style={{ color: 'var(--text-muted)' }}>
          {passed ? t('examResult.passed') : t('examResult.keepStudying')}
        </p>

        <div className={`text-4xl md:text-6xl font-bold mb-1 ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {score}%
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          {correct} {t('examResult.outOf')} {total} {t('examResult.correct')}
        </p>

        <div className="w-full rounded-full h-3 mb-6 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div
            className={`h-3 rounded-full transition-all duration-700 ${passed ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-rose-400 to-red-500'}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <button
          onClick={() => navigate('/courses')}
          className="w-full px-6 py-3 rounded-xl font-semibold transition-all text-white bg-blue-600 hover:bg-blue-700"
        >
          {t('examResult.backToCourses')}
        </button>
      </div>
    </div>
  )
}
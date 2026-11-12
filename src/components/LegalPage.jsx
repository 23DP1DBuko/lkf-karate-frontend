import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/useTheme'
import { usePageTitle } from '../hooks/usePageTitle'
import LandingHeader from './LandingHeader'
import LandingFooter from './LandingFooter'

/*
 * Legal prose lives in the locale files (legal.privacy / legal.terms / legal.gdpr),
 * not in a Strapi collection: it is static legal text that changes through code
 * review, not content an admin edits day to day. Keeping it in JSON means it ships
 * with the bundle, needs no API call, and cannot drift out of sync with the page
 * that renders it. If LKF ever needs to edit it without a deploy, move these same
 * keys into a content type with Lv/Ru/En suffixed fields and read them with
 * getLocalizedField — the section shape here is already data, not markup.
 *
 * Section shape: { heading, paragraphs?, bullets?, contact? }
 *   bullets   — string, or { bold, note?, text }, or { label, value }
 *   contact   — styled string appended to the first paragraph (an email/URL)
 */
const contactClass = (isDark) => (isDark ? 'text-blue-400' : 'text-blue-600')

function Bullet({ item, isDark }) {
  if (typeof item === 'string') return <li>{item}</li>
  if (item.label) {
    return (
      <li>
        {item.label} <span className={contactClass(isDark)}>{item.value}</span>
      </li>
    )
  }
  return (
    <li>
      <strong>{item.bold}</strong>
      {item.note ? ` ${item.note}` : ''} — {item.text}
    </li>
  )
}

export default function LegalPage({ doc }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const content = t(`legal.${doc}`, { returnObjects: true })
  const sections = Array.isArray(content?.sections) ? content.sections : []
  usePageTitle(content?.title)

  const bgColor = isDark ? '#03010A' : '#f1f5f9'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Skip navigation link */}
      <a href="#main-content" className="skip-link" onClick={() => document.getElementById('main-content')?.focus()}>{t('common.skipToContent')}</a>

      <LandingHeader isDark={isDark}>
        <Link to="/login" className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
          isDark
            ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-blue-500/10'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
        }`}>{t('landing.signIn')}</Link>
      </LandingHeader>

      <main id="main-content" tabIndex={-1} className="pt-24 pb-16 flex-1">
        <div className="max-w-3xl mx-auto px-4">
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 text-sm mb-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              isDark ? 'text-slate-400 hover:text-blue-400' : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('landing.backToHome')}
          </Link>

          <div className={`rounded-2xl p-8 md:p-10 border backdrop-blur-sm ${
            isDark
              ? 'bg-white/[0.03] border-white/[0.08]'
              : 'bg-white/60 border-slate-200/60 shadow-sm'
          }`}>
            <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {content?.title}
            </h1>
            <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {content?.effective}
            </p>

            <div className={`space-y-6 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {sections.map((section, i) => (
                <section key={i}>
                  <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>{section.heading}</h2>
                  {section.paragraphs?.map((paragraph, j) => (
                    <p key={j}>
                      {paragraph}
                      {section.contact && j === 0 && (
                        <> <span className={contactClass(isDark)}>{section.contact}</span></>
                      )}
                    </p>
                  ))}
                  {section.bullets?.length > 0 && (
                    <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {section.bullets.map((item, j) => (
                        <Bullet key={j} item={item} isDark={isDark} />
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <LandingFooter isDark={isDark} />
    </div>
  )
}

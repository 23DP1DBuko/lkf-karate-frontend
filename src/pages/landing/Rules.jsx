import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/useTheme'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../hooks/usePageTitle'
import LandingHeader from '../../components/LandingHeader'
import LandingFooter from '../../components/LandingFooter'

const RULES_PDFS = [
  {
    label: 'Kata Competition Rules 2026',
    url: 'https://www.wkf.net/files/pdf/documents/WKF%20Kata%20Competition%20Rules%202026%20MASTER%20COPY_V2.pdf',
    lang: 'EN',
  },
  {
    label: 'Kumite Competition Rules 2026',
    url: 'https://www.wkf.net/files/pdf/documents/WKF%202026%20Kumite%20Competition%20Rules%20MASTER%20COPY_V11.pdf',
    lang: 'EN',
  },
]

export default function Rules() {
  usePageTitle('WKF Competition Rules')
  const [selected, setSelected] = useState(RULES_PDFS[0])
  const { theme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const bgColor = isDark ? '#03010A' : '#f1f5f9'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Skip navigation link */}
      <a href="#main-content" className="skip-link" onClick={() => document.getElementById('main-content')?.focus()}>Skip to main content</a>

      <LandingHeader isDark={isDark}>
        <Link to="/rules" aria-current="page" className={`px-4 py-2 text-sm font-medium rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
          isDark ? 'text-white bg-white/[0.08]' : 'text-blue-700 bg-blue-50/60'
        }`}>{t('landing.rules')}</Link>
        <Link to="/login" className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
          isDark
            ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-blue-500/10'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
        }`}>{t('landing.signIn')}</Link>
      </LandingHeader>

      <main id="main-content" tabIndex={-1} className="pt-20 pb-12 flex-1">
        <div className="max-w-5xl mx-auto px-4">
          {/* Title section */}
          <div className="mb-8">
            <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {t('landing.rulesTitle')}
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('landing.rulesDesc')}
            </p>
          </div>

          {/* PDF selector tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {RULES_PDFS.map((pdf, i) => {
              const active = selected.url === pdf.url
              return (
                <button
                  key={i}
                  onClick={() => setSelected(pdf)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                    active
                      ? isDark
                        ? 'bg-blue-500/80 text-white border-blue-400/50 backdrop-blur-sm shadow-md shadow-blue-500/10'
                        : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : isDark
                        ? 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:border-blue-500/40 backdrop-blur-sm'
                        : 'bg-white/60 text-slate-600 border-slate-200/60 hover:border-blue-400/40 shadow-sm'
                  }`}
                >
                  {pdf.label}
                </button>
              )
            })}
          </div>

          {/* Download link */}
          <div className="flex items-center gap-3 mb-6">
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('landing.downloadPdf')}
            </a>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('landing.recommendedMobile')}
            </span>
          </div>

          {/* PDF iframe — desktop */}
          <div className={`hidden md:block rounded-2xl overflow-hidden border backdrop-blur-sm ${
            isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/60 bg-white/40 shadow-sm'
          }`} style={{ height: 'calc(100vh - 220px)' }}>
            <div className="w-full h-full">
              <iframe
                src={selected.url}
                className="w-full h-full"
                title={selected.label}
              />
            </div>
          </div>

          {/* Mobile fallback */}
          <div className={`md:hidden rounded-2xl p-8 text-center border backdrop-blur-sm ${
            isDark
              ? 'bg-white/[0.03] border-white/[0.08]'
              : 'bg-white/60 border-slate-200/60 shadow-sm'
          }`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              isDark ? 'bg-white/[0.06]' : 'bg-blue-50'
            }`}>
              <svg className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className={`font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{selected.label}</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('landing.pdfDesktopHint')}
            </p>
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isDark
                ? 'bg-white text-slate-900 shadow-blue-500/10'
                : 'bg-blue-600 text-white shadow-blue-500/20'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('landing.openDownloadPdf')}
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <LandingFooter isDark={isDark} />
    </div>
  )
}
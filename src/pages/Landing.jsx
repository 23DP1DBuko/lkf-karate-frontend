import { useState, useEffect, lazy, Suspense } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTranslation } from 'react-i18next'

import { useTheme } from '../context/useTheme'
import MobileNav from '../components/MobileNav'
const BentoCard = lazy(() => import('../components/BentoCard'))
import LandingFooter from '../components/LandingFooter'
import {
  ChevronDownIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  ChartBarIcon,
  UsersIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

const features = [
  { icon: BookOpenIcon, titleKey: 'features.courses', descKey: 'features.coursesDesc' },
  { icon: ClipboardDocumentListIcon, titleKey: 'features.exams', descKey: 'features.examsDesc' },
  { icon: BoltIcon, titleKey: 'features.quiz', descKey: 'features.quizDesc' },
  { icon: ChartBarIcon, titleKey: 'features.progress', descKey: 'features.progressDesc' },
  { icon: UsersIcon, titleKey: 'features.management', descKey: 'features.managementDesc' },
  { icon: AcademicCapIcon, titleKey: 'features.feedback', descKey: 'features.feedbackDesc' },
]

function BentoCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
      {[1, 2, 3].map(i => (
        <div key={i} className={`rounded-2xl p-6 animate-pulse ${
          i === 1 ? 'col-span-full' : ''
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-300/50" />
            <div className="h-4 w-32 rounded bg-slate-300/50" />
          </div>
          <div className="h-3 w-full rounded bg-slate-300/50 mb-2" />
          <div className="h-3 w-3/4 rounded bg-slate-300/50" />
        </div>
      ))}
    </div>
  )
}

export default function Landing() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  usePageTitle('LKF Academy')
  const { t } = useTranslation()

  // WKF-inspired palette: aka (red) + ao (blue)
  // Accent: gold (echoes karate prestige, medals, belts)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const brandGold = '#c9952b'
  const bgColor = isDark ? '#03010A' : '#f1f5f9'

  const [showScrollIndicator, setShowScrollIndicator] = useState(true)

  useEffect(() => {
    const onScroll = () => {
      setShowScrollIndicator(window.scrollY < window.innerHeight * 0.5)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) return null
  if (user) return <Navigate to="/dashboard" />

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? '' : 'light-landing'}`} style={{ backgroundColor: bgColor }}>
      {/* Skip navigation link — first focusable element for keyboard users */}
      <a href="#main-content" className="skip-link" onClick={() => document.getElementById('main-content')?.focus()}>Skip to main content</a>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b transition-all ${
        isDark ? 'bg-slate-900/40 border-white/[0.06]' : 'bg-white/70 border-slate-200/60'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl backdrop-blur-sm flex items-center justify-center border-2 ${
              isDark ? 'bg-white/10 border-blue-400/30' : 'bg-blue-50 border-blue-300/50'
            }`}>
              <span className={`font-bold text-xs tracking-wider ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>LKF</span>
            </div>
            <span className={`font-bold text-base tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Academy</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/rules" className={`px-4 py-3 text-sm font-medium rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}>{t('landing.rules')}</Link>
            <Link to="/login" className={`px-5 py-3 text-sm font-medium rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              isDark ? 'text-slate-200 hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/60'
            }`}>{t('landing.signIn')}</Link>
            <Link to="/register" className={`px-5 py-3 text-sm font-semibold rounded-xl transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              isDark
                ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-blue-500/10'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
            }`}>{t('landing.getStarted')}</Link>
          </div>

          <div className="md:hidden">
            <MobileNav isDark={isDark} />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="pt-20" />

        {/* Hero Section */}
        <section className="relative min-h-[500px] md:min-h-[550px] flex items-center max-w-6xl mx-auto px-4">
          <div className="relative z-10 w-full text-left">
            <div className={prefersReducedMotion ? '' : 'animate-hero-fade-in'}>
              {/* Gi icon */}
              <div className="flex justify-start mb-8">
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl backdrop-blur-xl border flex items-center justify-center shadow-2xl relative group ${
                  isDark
                    ? 'bg-white/[0.05] border-white/[0.12] shadow-blue-500/10'
                    : 'bg-white/60 border-blue-200/40 shadow-blue-500/5'
                }`}>
                  {/* Glow ring */}
                  <div className={`absolute inset-0 rounded-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-700 blur-xl ${
                    isDark
                      ? 'bg-gradient-to-br from-blue-500/20 to-red-500/10'
                      : 'bg-gradient-to-br from-blue-300/20 to-amber-300/15'
                  }`} />
                  <svg viewBox="0 0 64 64" fill="none" role="img" aria-label="Karate gi with open book and gold belt — LKF Academy" className={`w-12 h-12 md:w-14 md:h-14 relative z-10 drop-shadow-lg ${
                    isDark ? 'text-white' : 'text-blue-700'
                  }`}>
                    {/* Open book background — represents education/study */}
                    <path d="M6 52V20L32 8L58 20V52L32 62Z"
                      fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,86,219,0.06)'} />
                    <path d="M6 20L32 8L58 20"
                      stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,86,219,0.1)'}
                      strokeWidth="1" fill="none" />
                    {/* Book spine */}
                    <line x1="32" y1="8" x2="32" y2="62"
                      stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,86,219,0.08)'}
                      strokeWidth="0.5" />

                    {/* Karate gi */}
                    <path d="M32 4L16 14v12l4 4v18l12 8 12-8V30l4-4V14L32 4z" fill="currentColor" opacity="0.95" />
                    <path d="M16 26l16 10 16-10" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(26,86,219,0.3)'} strokeWidth="1.5" fill="none" />
                    {/* Gold belt accent — WKF prestige */}
                    <rect x="20" y="32" width="24" height="4" rx="1" fill={brandGold} />
                  </svg>
                </div>
              </div>

              <h1 className={`text-5xl md:text-7xl font-bold mb-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>LKF Academy</h1>
              <p className={`text-xs md:text-sm font-medium tracking-widest uppercase mb-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>Latvijas Karatē federācija</p>
              <p className={`text-lg md:text-xl mb-3 max-w-2xl font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{t('landing.subtitle')}</p>
              <p className={`text-base md:text-lg mb-10 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{t('landing.description')}</p>

              <div className="flex gap-4 justify-start flex-wrap">
                <Link to="/register" className={`px-8 py-3.5 rounded-xl font-semibold text-base shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  isDark
                    ? 'bg-white text-slate-900 shadow-blue-500/20 hover:shadow-blue-400/30'
                    : 'bg-blue-600 text-white shadow-blue-500/20 hover:shadow-blue-400/30'
                }`}>
                  {t('landing.getStarted')}
                </Link>
                <Link to="/login" className={`px-8 py-3.5 rounded-xl font-semibold text-base border transition-all duration-300 active:scale-95 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  isDark
                    ? 'border-white/[0.15] text-slate-200 hover:bg-white/[0.06] hover:border-white/[0.25]'
                    : 'border-slate-300/50 text-slate-600 hover:bg-slate-100/60 hover:border-slate-400'
                }`}>
                  {t('landing.signIn')}
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll-down indicator — positioned relative to hero section */}
          <div
            className={`absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-300 ease-out ${
              showScrollIndicator ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              onClick={() => {
                document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/60'
              } ${prefersReducedMotion ? '' : 'animate-chevron-bounce'}`}
              aria-label="Scroll to features"
            >
              <ChevronDownIcon className="w-6 h-6" />
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features-section" className="relative max-w-6xl mx-auto px-4 pb-16 scroll-mt-24">
          <div className="text-center mb-12">
            <h2 className={`text-2xl md:text-3xl font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t('landing.featuresTitle')}</h2>
            <div className={`w-12 h-1 rounded-full mx-auto ${isDark ? 'bg-blue-600/50' : 'bg-blue-500/60'}`} />
          </div>

          {/* Featured card — full width, larger treatment */}
          <Suspense fallback={<BentoCardSkeleton />}>
            <div className="mb-6">
              <BentoCard
                featured
                icon={features[0].icon}
                title={t(`landing.${features[0].titleKey}`)}
                description={t(`landing.${features[0].descKey}`)}
                isDark={isDark}
              />
            </div>

            {/* 3-column grid for middle features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
              {features.slice(1, 4).map((feature, i) => (
                <BentoCard key={i + 1} icon={feature.icon} title={t(`landing.${feature.titleKey}`)} description={t(`landing.${feature.descKey}`)} isDark={isDark} />
              ))}
            </div>

            {/* 2-column grid for remaining features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {features.slice(4).map((feature, i) => (
                <BentoCard key={i + 4} icon={feature.icon} title={t(`landing.${feature.titleKey}`)} description={t(`landing.${feature.descKey}`)} isDark={isDark} />
              ))}
            </div>
          </Suspense>
        </section>

        {/* CTA Section */}
        <section className="relative max-w-6xl mx-auto px-4 pb-20">
          <div
            className={`relative overflow-hidden rounded-3xl p-8 md:p-12 border ${
              isDark
                ? 'border-white/[0.06]'
                : 'border-blue-200/30 bg-white/40'
            }`}
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(30,64,175,0.08) 0%, rgba(153,27,27,0.04) 100%)'
                : 'linear-gradient(135deg, rgba(26,86,219,0.05) 0%, rgba(201,149,43,0.06) 100%)',
            }}
          >
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-blue-600/5 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="relative z-10 text-center">
              <h2 className={`text-2xl md:text-3xl font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t('landing.ctaTitle')}</h2>
              <p className={`mb-8 max-w-lg mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('landing.ctaDesc')}</p>
              <Link to="/register" className={`inline-flex px-8 py-3.5 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isDark
                  ? 'bg-white text-slate-900'
                  : 'bg-blue-600 text-white'
              }`}>
                {t('landing.createAccount')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <div className="mt-8">
        <LandingFooter isDark={isDark} />
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BookOpenIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/useAuth'

export default function MobileNav({ isDark = true }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => setOpen(false)

  const handleNav = (path) => {
    close()
    navigate(path)
  }

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
        aria-label="Open menu"
      >
        <Bars3Icon className={`w-6 h-6 ${isDark ? 'text-white' : 'text-slate-600'}`} />
      </button>

      {/* Portal both backdrop + drawer to document.body so they escape parent stacking contexts */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop overlay — always in DOM for smooth transitions */}
          <div
            className={`fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 ${
              open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={close}
            aria-hidden="true"
          />

          {/* Off-canvas drawer — always in DOM for smooth transitions */}
          <div
            className={`fixed top-0 right-0 bottom-0 h-full w-[280px] sm:w-[320px] shadow-2xl z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{
              isolation: 'isolate',
              backgroundColor: isDark ? '#0B0813' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#0f172a',
              borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226,232,240,1)'}`,
            }}
          >
            {/* Inner solid wrapper */}
            <div
              className="flex flex-col h-full p-6"
              style={{ backgroundColor: isDark ? '#0B0813' : '#ffffff' }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between pb-6" style={{
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,1)'}`,
              }}>
                <span className="text-sm font-bold tracking-wider text-blue-500 uppercase">
                  LKF Academy
                </span>
                <button
                  onClick={close}
                  className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Nav links */}
              <div className="flex flex-col space-y-3 mt-6 w-full flex-1">
                {!loading && user ? (
                  <>
                    <NavRow icon={HomeIcon} label="Dashboard" onClick={() => handleNav('/dashboard')} isDark={isDark} />
                    <NavRow icon={BookOpenIcon} label={t('nav.courses')} onClick={() => handleNav('/courses')} isDark={isDark} />
                    <NavRow icon={UserIcon} label={t('nav.profile')} onClick={() => handleNav('/profile')} isDark={isDark} />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleNav('/login')}
                      className={`w-full text-center font-medium text-sm py-3 px-4 rounded-xl border transition-all ${
                        isDark
                          ? 'border-white/[0.08] hover:bg-white/[0.02] text-slate-300'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {t('landing.signIn') || 'Sign In'}
                    </button>
                    <button
                      onClick={() => handleNav('/register')}
                      className="w-full text-center text-white bg-blue-600 hover:bg-blue-700 font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-600/10 active:scale-[0.99] transition-all"
                    >
                      {t('landing.getStarted') || 'Get Started'}
                    </button>
                  </>
                )}

                <div className="my-4" style={{
                  borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,1)'}`,
                }} />

                <NavRow icon={DocumentTextIcon} label="Rules" onClick={() => handleNav('/rules')} isDark={isDark} />
              </div>

              {/* Footer */}
              <div className="pt-6" style={{
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,1)'}`,
              }}>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('landing.footer')}
                </p>
              </div>
            </div>
          </div>
        </>
      ,
        document.body
      )}
    </>
  )
}

function NavRow({ icon: Icon, label, onClick, isDark = true }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isDark
          ? 'text-slate-500 hover:text-blue-500'
          : 'text-slate-500 hover:text-blue-500'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span>{label}</span>
    </button>
  )
}

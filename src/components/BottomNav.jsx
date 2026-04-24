import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { createRipple } from '../hooks/useRipple'
import {
  HomeIcon, BookOpenIcon, ChartBarIcon, UserIcon, AcademicCapIcon,
  DocumentTextIcon, QuestionMarkCircleIcon,
  ClipboardDocumentListIcon, UsersIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolid, BookOpenIcon as BookSolid,
  ChartBarIcon as ChartSolid, UserIcon as UserSolid,
  AcademicCapIcon as AdminSolid,
} from '@heroicons/react/24/solid'

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [adminOpen, setAdminOpen] = useState(false)

  const isActive = (path) => location.pathname === path
  const isAdmin = location.pathname.startsWith('/admin')

  const adminLinks = [
    { to: '/admin/courses', icon: BookOpenIcon, label: t('nav.admin.courses') },
    { to: '/admin/chapters', icon: DocumentTextIcon, label: t('nav.admin.chapters') },
    { to: '/admin/questions', icon: QuestionMarkCircleIcon, label: t('nav.admin.questions') },
    { to: '/admin/exams', icon: ClipboardDocumentListIcon, label: t('nav.admin.exams') },
    { to: '/admin/results', icon: ChartBarIcon, label: t('nav.admin.results') },
    { to: '/admin/users', icon: UsersIcon, label: t('nav.admin.users') },
  ]

  const tabs = [
    { to: '/dashboard', icon: HomeIcon, activeIcon: HomeSolid, label: t('nav.dashboard') },
    { to: '/courses', icon: BookOpenIcon, activeIcon: BookSolid, label: t('nav.courses') },
    { to: '/results', icon: ChartBarIcon, activeIcon: ChartSolid, label: t('nav.results') },
    ...(user?.isAdmin ? [{ admin: true, icon: AcademicCapIcon, activeIcon: AdminSolid, label: 'Admin' }] : []),
    { to: '/profile', icon: UserIcon, activeIcon: UserSolid, label: t('nav.profile') },
  ]

  return (
    <>
      {/* Overlay */}
      {adminOpen && (
        <div
          className="md:hidden fixed inset-0 z-20"
          onClick={() => setAdminOpen(false)}
        />
      )}

      {/* Bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t safe-area-pb"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
      >
        {/* Admin dropdown — slides up above nav */}
        {adminOpen && (
          <div
            className="absolute bottom-full left-0 right-0 border-t animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
            </div>
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Admin Panel
            </p>
            <div className="grid grid-cols-2 gap-2 px-3 pb-3">
              {adminLinks.map(link => {
                const active = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={(e) => { createRipple(e); setAdminOpen(false) }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium relative overflow-hidden transition-all active:scale-95"
                    style={{
                      backgroundColor: active ? '#2563eb' : 'var(--bg-secondary)',
                      color: active ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    <link.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-stretch h-16">
          {tabs.map((tab) => {
            const active = tab.admin ? isAdmin : isActive(tab.to)
            const Icon = (active || (tab.admin && adminOpen)) ? tab.activeIcon : tab.icon

            if (tab.admin) {
              return (
                <button
                  key="admin"
                  onClick={(e) => { createRipple(e); setAdminOpen(prev => !prev) }}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden transition-all active:scale-90"
                  style={{ color: active || adminOpen ? '#2563eb' : 'var(--text-muted)' }}
                >
                  <div className="relative">
                    <Icon className="w-6 h-6" />
                    {adminOpen && (
                      <ChevronUpIcon className="w-3 h-3 absolute -top-1 -right-1 text-blue-600" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{tab.label}</span>
                  {(active || adminOpen) && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-blue-600" />
                  )}
                </button>
              )
            }

            return (
              <Link
                key={tab.to}
                to={tab.to}
                onClick={(e) => { createRipple(e); setAdminOpen(false) }}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden transition-all active:scale-90"
                style={{ color: active ? '#2563eb' : 'var(--text-muted)' }}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium truncate max-w-full px-1">{tab.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-blue-600" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
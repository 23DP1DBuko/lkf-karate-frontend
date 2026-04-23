import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  HomeIcon,
  BookOpenIcon,
  ChartBarIcon,
  UserIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
  AcademicCapIcon as AcademicCapIconSolid,
} from '@heroicons/react/24/solid'

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useTranslation()

  const isActive = (path) => location.pathname.startsWith(path)

  const tabs = [
    { to: '/dashboard', icon: HomeIcon, activeIcon: HomeIconSolid, label: t('nav.dashboard') },
    { to: '/courses', icon: BookOpenIcon, activeIcon: BookOpenIconSolid, label: t('nav.courses') },
    { to: '/results', icon: ChartBarIcon, activeIcon: ChartBarIconSolid, label: t('nav.results') },
    ...(user?.isAdmin ? [{ to: '/admin/courses', icon: AcademicCapIcon, activeIcon: AcademicCapIconSolid, label: 'Admin' }] : []),
    { to: '/profile', icon: UserIcon, activeIcon: UserIconSolid, label: t('nav.profile') },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t safe-area-pb"
      style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}>
      <div className="flex items-stretch h-16">
        {tabs.map(tab => {
          const active = isActive(tab.to)
          const Icon = active ? tab.activeIcon : tab.icon
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
              style={{ color: active ? '#2563eb' : 'var(--text-muted)' }}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium truncate max-w-full px-1">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
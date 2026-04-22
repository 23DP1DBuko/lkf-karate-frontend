import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  HomeIcon,
  BookOpenIcon,
  ChartBarIcon,
  UserIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

function NavItem({ to, icon: Icon, label, onClick, active }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative ${
        active
          ? 'bg-blue-600 text-white'
          : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
      }`}
      style={{ color: active ? 'white' : 'var(--text-secondary)' }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}

function NavButton({ onClick, icon: Icon, label, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        danger
          ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'
          : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
      }`}
      style={{ color: danger ? undefined : 'var(--text-secondary)' }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setOpen(false)
  }

  const isActive = (path) => location.pathname === path
  const isAdminActive = location.pathname.startsWith('/admin')

  const close = () => setOpen(false)

  const adminLinks = [
    { to: '/admin/courses', icon: BookOpenIcon, label: t('nav.admin.courses') },
    { to: '/admin/chapters', icon: DocumentTextIcon, label: t('nav.admin.chapters') },
    { to: '/admin/questions', icon: QuestionMarkCircleIcon, label: t('nav.admin.questions') },
    { to: '/admin/exams', icon: ClipboardDocumentListIcon, label: t('nav.admin.exams') },
    { to: '/admin/results', icon: ChartBarIcon, label: t('nav.admin.results') },
    { to: '/admin/users', icon: UsersIcon, label: t('nav.admin.users') },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link to="/dashboard" onClick={close} className="flex items-center gap-2">
          <span className="text-2xl">🥋</span>
          <span className="font-bold text-blue-700 text-lg">LKF Karate</span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/dashboard" icon={HomeIcon} label={t('nav.dashboard')} active={isActive('/dashboard')} onClick={close} />
        <NavItem to="/courses" icon={BookOpenIcon} label={t('nav.courses')} active={isActive('/courses')} onClick={close} />
        <NavItem to="/results" icon={ChartBarIcon} label={t('nav.results')} active={isActive('/results')} onClick={close} />
        <NavItem to="/profile" icon={UserIcon} label={t('nav.profile')} active={isActive('/profile')} onClick={close} />

        {/* Admin section */}
        {user?.isAdmin && (
          <div className="pt-2">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isAdminActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
              style={{ color: isAdminActive ? '#2563eb' : 'var(--text-secondary)' }}
            >
              <AcademicCapIcon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1 text-left">Admin</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
            </button>

            {adminOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                {adminLinks.map(link => (
                  <NavItem
                    key={link.to}
                    to={link.to}
                    icon={link.icon}
                    label={link.label}
                    active={isActive(link.to)}
                    onClick={close}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <NavButton onClick={handleLogout} icon={ArrowRightOnRectangleIcon} label={t('nav.logout')} danger />
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-40"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
      >
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">🥋</span>
          <span className="font-bold text-blue-700">LKF Karate</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle menu"
        >
          {open ? <XMarkIcon className="w-6 h-6" style={{ color: 'var(--text-primary)' }} /> : <Bars3Icon className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={close}
        />
      )}

      {/* Mobile slide-out sidebar */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 z-40 transform transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ backgroundColor: 'var(--bg-card)' }}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 flex-shrink-0 min-h-screen border-r sticky top-0 h-screen"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
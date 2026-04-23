import { useState, useEffect } from 'react'
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
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

function NavItem({ to, icon: Icon, label, onClick, active, collapsed }) {
  const [tooltipPos, setTooltipPos] = useState(null)

  const handleMouseEnter = (e) => {
    if (!collapsed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 8 })
  }

  const handleMouseLeave = () => setTooltipPos(null)

  return (
    <div className="relative">
      <Link
        to={to}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
          collapsed ? 'justify-center' : ''
        } ${
          active ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
        }`}
        style={{ color: active ? 'white' : 'var(--text-secondary)' }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
      </Link>

      {tooltipPos && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: tooltipPos.top, left: tooltipPos.left, transform: 'translateY(-50%)' }}
        >
          <div className="px-3 py-1.5 text-sm rounded-lg whitespace-nowrap shadow-xl font-medium"
            style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
            {label}
          </div>
        </div>
      )}
    </div>
  )
}

function NavButton({ onClick, icon: Icon, label, danger, collapsed }) {
  const [tooltipPos, setTooltipPos] = useState(null)

  const handleMouseEnter = (e) => {
    if (!collapsed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 8 })
  }

  const handleMouseLeave = () => setTooltipPos(null)

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
          collapsed ? 'justify-center' : ''
        } ${
          danger ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
        }`}
        style={{ color: danger ? undefined : 'var(--text-secondary)' }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="text-sm font-medium">{label}</span>}
      </button>

      {tooltipPos && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: tooltipPos.top, left: tooltipPos.left, transform: 'translateY(-50%)' }}
        >
          <div className="px-3 py-1.5 text-sm rounded-lg whitespace-nowrap shadow-xl font-medium"
            style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
            {label}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebarCollapsed') === 'true'
  )
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed)
  }, [collapsed])

  useEffect(() => {
    let startX = 0
    let startY = 0
    let isDragging = false

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      isDragging = startX < 60 || mobileOpen
    }

    const handleTouchMove = (e) => {
      if (!isDragging) return
      const currentX = e.touches[0].clientX
      const diffX = currentX - startX
      const diffY = Math.abs(e.touches[0].clientY - startY)
      if (diffY > 50) { isDragging = false; return }

      const sidebar = document.getElementById('mobile-sidebar')
      if (!sidebar) return

      if (!mobileOpen && diffX > 0) {
        const progress = Math.min(diffX / 288, 1)
        sidebar.style.transform = `translateX(${-100 + progress * 100}%)`
        sidebar.style.transition = 'none'
      } else if (mobileOpen && diffX < 0) {
        const offset = Math.max(diffX, -288)
        sidebar.style.transform = `translateX(${offset}px)`
        sidebar.style.transition = 'none'
      }
    }

    const handleTouchEnd = (e) => {
      if (!isDragging) return
      isDragging = false

      const endX = e.changedTouches[0].clientX
      const diffX = endX - startX
      const diffY = Math.abs(e.changedTouches[0].clientY - startY)

      const sidebar = document.getElementById('mobile-sidebar')
      if (sidebar) {
        sidebar.style.transform = ''
        sidebar.style.transition = ''
      }

      if (diffY > 50) return

      if (!mobileOpen && diffX > 60) {
        setMobileOpen(true)
      } else if (mobileOpen && diffX < -60) {
        setMobileOpen(false)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [mobileOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMobileOpen(false)
  }

  const isActive = (path) => location.pathname === path
  const isAdminActive = location.pathname.startsWith('/admin')
  const close = () => setMobileOpen(false)

  const adminLinks = [
    { to: '/admin/courses', icon: BookOpenIcon, label: t('nav.admin.courses') },
    { to: '/admin/chapters', icon: DocumentTextIcon, label: t('nav.admin.chapters') },
    { to: '/admin/questions', icon: QuestionMarkCircleIcon, label: t('nav.admin.questions') },
    { to: '/admin/exams', icon: ClipboardDocumentListIcon, label: t('nav.admin.exams') },
    { to: '/admin/results', icon: ChartBarIcon, label: t('nav.admin.results') },
    { to: '/admin/users', icon: UsersIcon, label: t('nav.admin.users') },
  ]

  const SidebarContent = ({ isCollapsed, isMobile }) => (
    <div className="flex flex-col h-full">
      {/* Logo + collapse button */}
      <div className={`flex items-center border-b py-4 ${isCollapsed ? 'justify-center px-3' : 'justify-between px-4'}`}
        style={{ borderColor: 'var(--border)' }}>
        {!isCollapsed && (
          <Link to="/dashboard" onClick={isMobile ? close : undefined} className="flex items-center gap-2">
            <span className="text-xl">🥋</span>
            <span className="font-bold text-blue-700">LKF Karate</span>
          </Link>
        )}
        {isCollapsed && (
          <span className="text-xl">🥋</span>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <ChevronDoubleRightIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              : <ChevronDoubleLeftIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            }
          </button>
        )}
        {isMobile && (
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
          </button>
        )}
      </div>

      {/* User info */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
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
      )}

      {isCollapsed && (
        <div className="px-3 py-3 border-b flex justify-center" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-visible">
        <NavItem to="/dashboard" icon={HomeIcon} label={t('nav.dashboard')} active={isActive('/dashboard')} onClick={isMobile ? close : undefined} collapsed={isCollapsed} />
        <NavItem to="/courses" icon={BookOpenIcon} label={t('nav.courses')} active={isActive('/courses')} onClick={isMobile ? close : undefined} collapsed={isCollapsed} />
        <NavItem to="/results" icon={ChartBarIcon} label={t('nav.results')} active={isActive('/results')} onClick={isMobile ? close : undefined} collapsed={isCollapsed} />
        <NavItem to="/profile" icon={UserIcon} label={t('nav.profile')} active={isActive('/profile')} onClick={isMobile ? close : undefined} collapsed={isCollapsed} />

        {user?.isAdmin && (
          <div className="pt-1">
            {isCollapsed ? (
              <div className="space-y-0.5">
                {adminLinks.map(link => (
                  <NavItem key={link.to} to={link.to} icon={link.icon} label={link.label}
                    active={isActive(link.to)} onClick={isMobile ? close : undefined} collapsed={isCollapsed} />
                ))}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isAdminActive ? 'text-blue-600' : ''
                  } hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                  style={{ color: isAdminActive ? '#2563eb' : 'var(--text-secondary)' }}
                >
                  <AcademicCapIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">Admin</span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                </button>

                {adminOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-blue-200 dark:border-blue-800 pl-2">
                    {adminLinks.map(link => (
                      <NavItem key={link.to} to={link.to} icon={link.icon} label={link.label}
                        active={isActive(link.to)} onClick={isMobile ? close : undefined} collapsed={false} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-3 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
        <NavButton onClick={handleLogout} icon={ArrowRightOnRectangleIcon} label={t('nav.logout')} danger collapsed={isCollapsed} />
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
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={close} />
      )}

      {/* Mobile sidebar */}
      <div 
        id='mobile-sidebar'
        className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ backgroundColor: 'var(--bg-card)' }}>
        <SidebarContent isCollapsed={false} isMobile={true} />
      </div>

      {/* Desktop sidebar — only renders on md+ */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 border-r sticky top-0 h-screen transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', overflow: 'visible' }}
      >
        <SidebarContent isCollapsed={collapsed} isMobile={false} />
      </aside>
    </>
  )
}
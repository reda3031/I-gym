import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  LogOut,
  Dumbbell,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  User,
  UserCog,
  Building2,
  BookOpen,
  ClipboardList,
  UserRound,
  CreditCard,
  Clock,
  X
} from 'lucide-react'

const navByRole = {
  super_admin: [
    { to: '/superadmin',       icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/superadmin/clubs', icon: Building2,       labelKey: 'nav.gyms' },
  ],
  admin: [
    { to: '/admin',                icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/admin/gym',            icon: Building2,       labelKey: 'nav.gym' },
    { to: '/admin/courses',        icon: BookOpen,        labelKey: 'nav.courses' },
    { to: '/admin/members',        icon: UserRound,       labelKey: 'nav.members' },
    { to: '/admin/coaches',        icon: GraduationCap,   labelKey: 'nav.coaches' },
    { to: '/admin/reservations',   icon: ClipboardList,   labelKey: 'nav.reservations' },
    { to: '/admin/subscriptions',  icon: CreditCard,      labelKey: 'nav.subscriptions' },
    { to: '/planning',             icon: Calendar,        labelKey: 'nav.planning' },
  ],
  coach: [
    { to: '/coach',                     icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/coach?tab=sessions',        icon: ClipboardList,   labelKey: 'coach.tabs.sessions' },
    { to: '/coach?tab=availabilities',  icon: Clock,           labelKey: 'coach.tabs.availabilities' },
    { to: '/coach?tab=challenges',      icon: Trophy,          labelKey: 'coach.tabs.challenges' },
    { to: '/planning',                  icon: Calendar,        labelKey: 'nav.planning' },
  ],
  adherent: [
    { to: '/adherent',                  icon: LayoutDashboard, labelKey: 'nav.overview' },
    { to: '/adherent?tab=coaches',      icon: GraduationCap,   labelKey: 'nav.adherentCoaches' },
    { to: '/adherent?tab=challenges',   icon: Trophy,          labelKey: 'nav.challenges' },
    { to: '/adherent?tab=subscription', icon: CreditCard,      labelKey: 'nav.mySubscription' },
    { to: '/planning',                  icon: Calendar,        labelKey: 'nav.planning' },
  ],
}

const roleGradient = {
  super_admin: 'from-violet-600 to-fuchsia-700',
  admin:    'from-indigo-500 to-indigo-700',
  coach:    'from-amber-500 to-amber-700',
  adherent: 'from-emerald-500 to-emerald-700',
}

/**
 * Sidebar rétractable (style Manar)
 * Largeur dynamique : 240px (déplié) / 72px (plié) sur écran large.
 * Devient un tiroir mobile de 280px sur petit écran.
 */
export default function Sidebar({ isCollapsed, toggleSidebar, isMobileOpen, toggleMobileSidebar }) {
  const { user, logout, exitImpersonation } = useAuth()
  const { t, lang } = useTranslation()
  const isRtl = lang === 'ar'
  const navigate = useNavigate()
  const location = useLocation()
  const links = navByRole[user?.role] || []
  const gradient = roleGradient[user?.role] || roleGradient.adherent
  const [usersOpen, setUsersOpen] = useState(false)
  const [currentHash, setCurrentHash] = useState(location.hash)

  useEffect(() => {
    setCurrentHash(location.hash)
  }, [location.hash])

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleLinkClick = (e, targetTo) => {
    if (targetTo === '/superadmin') {
      if (location.pathname === '/superadmin') {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleExitImpersonation = async () => {
    await exitImpersonation()
    if (toggleMobileSidebar && isMobileOpen) {
      toggleMobileSidebar()
    }
    navigate('/superadmin')
  }

  const isImpersonating = !!localStorage.getItem('igym_super_token')

  const sidebarWidth = '240px'
  const collapsedWidth = '72px'

  return (
    <>
      <style>{`
        @media (max-width: 1023px) {
          #main-sidebar {
            transform: translateX(${isRtl ? '100%' : '-100%'});
            width: 280px !important;
          }
          #main-sidebar.mobile-open {
            transform: translateX(0);
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
          }
        }
      `}</style>
      <aside
        id="main-sidebar"
        className={`fixed z-50 flex flex-col justify-between py-3 transition-all duration-300 select-none ${isMobileOpen ? 'mobile-open' : ''}`}
        style={{
          left: isRtl ? 'auto' : '0',
          right: isRtl ? '0' : 'auto',
          top: isImpersonating ? '36px' : '0',
          height: isImpersonating ? 'calc(100vh - 36px)' : '100vh',
          width: isCollapsed ? collapsedWidth : sidebarWidth,
          background: 'var(--manar-sidebar-bg)',
          borderRight: isRtl ? 'none' : '1px solid var(--manar-sidebar-border)',
          borderLeft: isRtl ? '1px solid var(--manar-sidebar-border)' : 'none',
        }}
      >
      {/* ── PARTIE HAUTE ── */}
      <div className="w-full flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 mb-5 mt-1 h-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg cursor-pointer shrink-0`}
              title="I-Gym"
            >
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div className={`flex flex-col min-w-0 transition-opacity duration-200 ${isCollapsed ? 'lg:hidden' : 'lg:flex'}`}>
              <h1 className="text-sm font-black tracking-wide leading-none text-slate-800 dark:text-slate-100">I-Gym</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">Fitness 2.0</p>
            </div>
          </div>
          {toggleMobileSidebar && (
            <button
              onClick={toggleMobileSidebar}
              className="lg:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Profil utilisateur (si déplié) */}
        {user && (
          <div className={`px-4 mb-4 transition-all duration-200 ${isCollapsed ? 'block lg:hidden' : 'block'}`}>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-150 dark:border-navy-700 bg-slate-50 dark:bg-navy-850">
              <div
                className={`w-8 h-8 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {user?.name}
                </p>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                  {t(`nav.${user?.role}`)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-col items-center gap-1 w-full px-3">
          {isImpersonating && (
            <button
              onClick={handleExitImpersonation}
              title={isCollapsed ? "Quitter la simulation" : undefined}
              className="flex items-center w-full rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-500 transition-all duration-300 select-none px-3.5 py-2.5 gap-3 h-11 mb-2 hover:scale-[1.02] shadow-[0_4px_12px_rgba(249,115,22,0.15)] cursor-pointer"
            >
              <LogOut className="w-5 h-5 shrink-0 rotate-180" />
              {(!isCollapsed || (window.innerWidth < 1024)) && (
                <span className="text-xs font-bold truncate">Quitter la simulation</span>
              )}
            </button>
          )}
          {links.map(({ to, icon: Icon, labelKey }) => {
            const isDashboardLink = to === '/superadmin'
            
            let active = false;
            const linkPath = to.split('?')[0];
            const linkSearch = to.includes('?') ? to.substring(to.indexOf('?')) : '';
            
            if (linkSearch) {
               active = location.pathname === linkPath && location.search === linkSearch;
            } else {
               if (to === '/adherent' || to === '/coach') {
                 active = location.pathname === to && (location.search === '' || location.search === '?tab=overview' || location.search === '?tab=dashboard');
               } else {
                 active = location.pathname === to;
               }
            }

            return (
              <NavLink
                key={to}
                to={to}
                onClick={(e) => {
                  handleLinkClick(e, to)
                  if (window.innerWidth < 1024 && toggleMobileSidebar) {
                    toggleMobileSidebar()
                  }
                }}
                title={isCollapsed ? t(labelKey) : undefined}
                className={
                  `flex items-center w-full rounded-xl border border-transparent transition-all duration-300 group relative select-none px-3.5 py-2.5 gap-3 h-11 hover:translate-x-1.5
                  ${isCollapsed ? 'lg:justify-center lg:px-0 lg:gap-0 lg:hover:translate-x-0' : ''}
                  ${active
                    ? 'bg-gradient-to-r from-indigo-500/12 to-violet-500/4 text-indigo-400 border-indigo-500/20 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.12)] font-bold'
                    : 'text-slate-400 dark:text-slate-500 hover:bg-indigo-500/6 hover:text-indigo-400 hover:border-indigo-500/10'
                  }`
                }
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''}`} />
                <span className={`text-xs truncate transition-opacity duration-200 ${isCollapsed ? 'block lg:hidden' : 'block'}`}>
                  {t(labelKey)}
                </span>
                
                {/* Dynamic indicators and badges */}
                {active && isDashboardLink && (
                  <span className={`ml-auto h-2 w-2 relative ${isCollapsed ? 'flex lg:hidden' : 'flex'}`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                
                {active && (
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 w-[4px] h-6 bg-gradient-to-b from-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]
                    ${isRtl ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'}`}
                  />
                )}
              </NavLink>
            )
          })}

          {/* Collapsible Users Dropdown for Super Admin */}
          {user?.role === 'super_admin' && (
            <div className="w-full flex flex-col gap-1 mt-1">
              {/* Accordion Toggle Header */}
              <button
                onClick={() => {
                  if (isCollapsed && window.innerWidth >= 1024) toggleSidebar()
                  setUsersOpen(!usersOpen)
                }}
                className={`flex items-center justify-between w-full rounded-xl border border-transparent transition-all duration-300 group text-slate-400 dark:text-slate-500 hover:bg-indigo-500/6 hover:text-indigo-400 hover:border-indigo-500/10 px-3.5 py-2.5 gap-3 h-11 hover:translate-x-1.5
                  ${isCollapsed ? 'lg:justify-center lg:px-0 lg:gap-0 lg:hover:translate-x-0' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                  <span className={`text-xs truncate font-medium ${isCollapsed ? 'block lg:hidden' : 'block'}`}>
                    {t('nav.users')}
                  </span>
                </div>
                <div className={`items-center gap-1.5 ${isCollapsed ? 'flex lg:hidden' : 'flex'}`}>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${usersOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                </div>
              </button>

              {/* Sub-items list */}
              {usersOpen && (
                <div className={`flex-col gap-1.5 mt-1 pb-1 ${isCollapsed ? 'flex lg:hidden' : 'flex'}
                  ${isRtl 
                    ? 'pr-4 pl-1 border-r border-slate-200 dark:border-navy-700 mr-5' 
                    : 'pl-4 pr-1 border-l border-slate-200 dark:border-navy-700 ml-5'}`}>
                  {/* Administrateurs */}
                  <NavLink
                    to="/superadmin/users?role=admin"
                    onClick={() => window.innerWidth < 1024 && toggleMobileSidebar && toggleMobileSidebar()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] transition-all duration-300 group border border-transparent
                      ${isActive 
                        ? 'bg-indigo-500/10 text-indigo-400 font-bold border-indigo-500/15 shadow-[0_2px_10px_-2px_rgba(99,102,241,0.08)]' 
                        : 'text-slate-400 hover:bg-indigo-500/5 hover:text-indigo-400 hover:translate-x-1'}`
                    }
                  >
                    <Shield className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    <span>{t('nav.admins')}</span>
                  </NavLink>

                  {/* Personnel d'abonnement */}
                  <NavLink
                    to="/superadmin/users?role=coach"
                    onClick={() => window.innerWidth < 1024 && toggleMobileSidebar && toggleMobileSidebar()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] transition-all duration-300 group border border-transparent
                      ${isActive 
                        ? 'bg-indigo-500/10 text-indigo-400 font-bold border-indigo-500/15 shadow-[0_2px_10px_-2px_rgba(99,102,241,0.08)]' 
                        : 'text-slate-400 hover:bg-indigo-500/5 hover:text-indigo-400 hover:translate-x-1'}`
                    }
                  >
                    <UserCog className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    <span>{t('nav.coaches')}</span>
                  </NavLink>

                  {/* Adhérents */}
                  <NavLink
                    to="/superadmin/users?role=adherent"
                    onClick={() => window.innerWidth < 1024 && toggleMobileSidebar && toggleMobileSidebar()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] transition-all duration-300 group border border-transparent
                      ${isActive 
                        ? 'bg-indigo-500/10 text-indigo-400 font-bold border-indigo-500/15 shadow-[0_2px_10px_-2px_rgba(99,102,241,0.08)]' 
                        : 'text-slate-400 hover:bg-indigo-500/5 hover:text-indigo-400 hover:translate-x-1'}`
                    }
                  >
                    <User className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    <span>{t('nav.members')}</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* ── PARTIE BASSE ── */}
      <div className="w-full flex flex-col gap-2 px-3">
        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          title={isCollapsed ? t('nav.logout') : undefined}
          className={`flex items-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 px-3 py-2.5 gap-3 h-10 w-full
            ${isCollapsed ? 'lg:justify-center lg:h-11 lg:w-11 lg:mx-auto lg:px-0 lg:gap-0' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`text-xs ${isCollapsed ? 'block lg:hidden' : 'block'}`}>{t('nav.logout')}</span>
        </button>

        {/* Ligne de séparation */}
        <div className="h-[1px] bg-slate-150 dark:bg-navy-700 my-1 w-full" />

        {/* Bouton de réduction (Toggle) */}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? t('common.expandMenu') : t('common.collapseMenu')}
          className={`hidden lg:flex items-center rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors duration-200 px-3 py-2.5 gap-3 h-10 w-full
            ${isCollapsed ? 'justify-center h-11 w-11 mx-auto px-0 gap-0' : ''}`}
        >
          {isCollapsed ? (
            isRtl ? <ChevronLeft className="w-5 h-5 shrink-0" /> : <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              {isRtl ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
              <span className="text-xs font-medium truncate">{t('common.collapseMenu')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
    </>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCheck, User, LogOut, Menu } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../context/AuthContext'
import ThemeToggle from '../ui/ThemeToggle'
import { LanguageSwitcher } from '../ui'
import { useTranslation } from '../../context/TranslationContext'

const typeIcons = {
  cours_reminder:         '⏰',
  subscription_expiry:    '⚠️',
  coach_change:           '🔔',
  badge_unlocked:         '🏆',
  weekly_recap:           '📊',
  check_in_success:       '✅',
  reservation_confirmed:  '📅',
}

/**
 * Header style Manar : transparent, avec horloge temps réel à gauche
 * et actions à droite. La position gauche s'adapte au menu rétractable.
 */
export default function Header({ isCollapsed, toggleMobileSidebar }) {
  const { user, exitImpersonation } = useAuth()
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [time, setTime]   = useState('')
  const dropRef = useRef(null)
  const profileRef = useRef(null)
  const { t, lang } = useTranslation()
  const isRtl = lang === 'ar'

  /* Horloge temps réel */
  useEffect(() => {
    const localeMap = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA', es: 'es-ES', de: 'de-DE' };
    const currentLocale = localeMap[lang] || 'fr-FR';
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString(currentLocale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lang])

  /* Fermer dropdown en cliquant en dehors */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? '☀️' : greetingHour < 18 ? '🌤️' : '🌙'

  const localeMap = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA', es: 'es-ES', de: 'de-DE' };
  const currentLocale = localeMap[lang] || 'fr-FR';
  const dayLabel = new Date().toLocaleDateString(currentLocale, { weekday: 'long', day: 'numeric', month: 'long' })

  const isImpersonating = !!localStorage.getItem('igym_super_token')

  const handleExitImpersonation = async () => {
    await exitImpersonation()
    navigate('/superadmin')
  }

  return (
    <header
      id="main-header"
      className="fixed z-30 flex items-center justify-between px-3 sm:px-5 transition-all duration-300"
      style={{
        top: isImpersonating ? '44px' : '8px',
        height: '60px',
        background: 'transparent',
      }}
    >
      <style>{`
        #main-header { left: 0; right: 0; }
        @media (min-width: 1024px) {
          #main-header {
            left: ${isRtl ? '0' : (isCollapsed ? '72px' : '240px')};
            right: ${isRtl ? (isCollapsed ? '72px' : '240px') : '0'};
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s ease;
          }
        }
      `}</style>

      {/* ── Gauche : Horloge + date + Menu Mobile ── */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 -ml-2 rounded-xl bg-bg-hover border border-border flex items-center justify-center text-text hover:text-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-bg/40 backdrop-blur-md border border-border/60 shadow-sm transition-all hover:border-accent/40 hover:bg-bg/60 group cursor-default select-none">
          <span className="text-base group-hover:scale-110 transition-transform duration-300">
            {greeting}
          </span>
          <div className="flex flex-col">
            <span
              className="text-xs font-black font-mono tracking-wider leading-none"
              style={{ color: 'var(--manar-text-main)' }}
            >
              {time}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider mt-1 leading-none" style={{ color: 'var(--text-dim)' }}>
              {dayLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Droite : i18n + thème + notifs ── */}
      <div className="flex items-center gap-2">
        {isImpersonating && (
          <button
            onClick={handleExitImpersonation}
            className="flex lg:hidden items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-95 transition-all mr-1 cursor-pointer"
          >
            <LogOut className="w-3 h-3 rotate-180" />
            Quitter
          </button>
        )}
        <LanguageSwitcher />
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative" ref={dropRef}>
          <button
            id="notifications-btn"
            onClick={() => setOpen(!open)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
            style={{
              background: open ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
            onMouseLeave={(e) => !open && (e.currentTarget.style.background = 'transparent')}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="notif-badge absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown notifs */}
          {open && (
            <div
              className={`absolute top-12 w-80 rounded-xl overflow-hidden z-50 ${isRtl ? 'left-0' : 'right-0'}`}
              style={{
                background: 'var(--manar-card-bg)',
                border: '1px solid var(--manar-card-border)',
                boxShadow: 'var(--manar-card-shadow)',
                animation: 'modalScaleIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--manar-card-border)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--manar-text-main)' }}>
                  {t('notifications.title') || 'Notifications'}
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" /> {t('notifications.markAllRead') || 'Tout lire'}
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} style={{ color: 'var(--text-dim)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    <Bell className="w-7 h-7 mx-auto mb-2 opacity-30" />
                    {t('notifications.noNotifications') || 'Aucune notification'}
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-150"
                      style={{
                        borderBottom: '1px solid var(--manar-card-border)',
                        background: !notif.is_read ? 'rgba(99,102,241,0.05)' : 'transparent',
                      }}
                      onClick={() => !notif.is_read && markRead(notif.id)}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = !notif.is_read ? 'rgba(99,102,241,0.05)' : 'transparent'}
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">{typeIcons[notif.type] || '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold`}
                          style={{ color: !notif.is_read ? 'var(--manar-text-main)' : 'var(--text-muted)' }}>
                          {notif.title}
                        </p>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-dim)' }}>
                          {notif.message}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar & Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1 shadow-sm border-2 border-transparent hover:border-accent overflow-hidden transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            title={user?.name}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase()
            )}
          </button>

          {profileOpen && (
            <div className={`absolute top-full mt-2 w-64 bg-bg-card border border-border shadow-card rounded-2xl overflow-hidden z-50 animate-scale-up ${isRtl ? 'left-0' : 'right-0'}`}>
              <div className="p-4 border-b border-border/50 flex items-center gap-3 bg-bg-hover">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase()
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-text truncate">{user?.name}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                  <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mt-0.5">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="p-2">
                <NavLink
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-text-dim hover:text-text hover:bg-bg-hover rounded-xl transition-colors"
                >
                  <User className="w-4 h-4" />
                  {t('nav.profile')}
                </NavLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

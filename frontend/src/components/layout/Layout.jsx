import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'

/**
 * Layout principal — Design Manar appliqué sur I-Gym avec menu rétractable
 */
export default function Layout({ children }) {
  const { lang } = useTranslation()
  const { user, exitImpersonation } = useAuth()
  const navigate = useNavigate()
  const isRtl = lang === 'ar'
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev)
  }

  const handleExitImpersonation = async () => {
    await exitImpersonation()
    navigate('/superadmin')
  }

  const sidebarWidth = isCollapsed ? '72px' : '240px'
  const isImpersonating = !!localStorage.getItem('igym_super_token')

  return (
    <div
      className="manar-dashboard-container relative"
      style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--manar-body-bg)' }}
    >
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div 
          className="fixed top-0 left-0 w-full h-[40px] bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white text-xs px-4 sm:px-6 font-bold flex items-center justify-between shadow-xl z-50 border-b border-orange-500/20"
        >
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline animate-pulse bg-white/20 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black border border-white/20">
              Impersonation Mode
            </span>
            <span className="truncate">
              Simulation <strong className="underline text-yellow-100">{user?.name}</strong>
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="px-2.5 py-1 bg-white/10 hover:bg-white text-white hover:text-orange-600 border border-white/20 hover:border-transparent rounded-lg font-black tracking-wide text-[9px] sm:text-[10px] uppercase transition-all duration-200 whitespace-nowrap"
          >
            Quitter
          </button>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity" 
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggleSidebar={toggleSidebar} 
        isMobileOpen={isMobileOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />

      {/* Zone principale */}
      <main
        className="manar-dashboard-main lg:transition-all"
        style={{
          flex: 1,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <style>{`
          @media (min-width: 1024px) {
            .manar-dashboard-main {
              margin-left: ${isRtl ? '0' : sidebarWidth};
              margin-right: ${isRtl ? sidebarWidth : '0'};
              transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
          }
        `}</style>

        {/* Header transparent */}
        <Header 
          isCollapsed={isCollapsed} 
          toggleMobileSidebar={toggleMobileSidebar} 
        />

        {/* Contenu flottant */}
        <div
          className="manar-dashboard-content"
          style={{
            flex: 1,
            marginTop: isImpersonating ? '112px' : '76px',
            marginRight: isRtl ? '0.5rem' : '0.75rem',
            marginLeft: isRtl ? '0.75rem' : '0.5rem',
            marginBottom: '0.75rem',
            borderRadius: '0.75rem',
            background: 'var(--manar-card-bg)',
            border: isImpersonating ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid var(--manar-card-border)',
            boxShadow: isImpersonating ? '0 0 20px rgba(249, 115, 22, 0.25)' : 'var(--manar-card-shadow)',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1.25rem',
            transition: 'margin-top 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {children}
        </div>
      </main>
    </div>
  )
}

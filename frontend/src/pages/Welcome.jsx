import { useNavigate } from 'react-router-dom'
import { Dumbbell, LogIn, UserPlus, ArrowRight, ShieldCheck, Trophy, Zap, ChevronRight } from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'
import { LanguageSwitcher } from '../components/ui'
import { useTranslation } from '../context/TranslationContext'
import { useTheme } from '../context/ThemeContext'

export default function Welcome() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500" style={{ background: 'var(--bg)' }}>

      {/* ── BACKGROUND IMAGE with theme-aware overlay ── */}
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: 'url("/gym_landing_bg.png")' }}
      />

      {/* Adaptive dark/light overlay */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(9,13,22,0.88) 0%, rgba(15,23,42,0.8) 50%, rgba(9,13,22,0.92) 100%)'
            : 'linear-gradient(135deg, rgba(242,242,247,0.88) 0%, rgba(255,255,255,0.78) 50%, rgba(230,230,237,0.90) 100%)',
        }}
      />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Accent glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/4 w-[420px] h-[420px] rounded-full blur-[150px] animate-pulse"
          style={{ background: 'var(--accent-muted)', animationDuration: '7s' }}
        />
        <div
          className="absolute bottom-1/4 right-1/5 w-[350px] h-[350px] rounded-full blur-[130px] animate-pulse"
          style={{ background: 'var(--info-muted)', animationDuration: '9s' }}
        />
      </div>

      {/* ── HEADER BAR ── */}
      <header className="relative z-20 flex items-center justify-between px-6 pt-5 pb-2">
        {/* Branding mini */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}
          >
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black tracking-tight" style={{ color: 'var(--text-strong)' }}>
            I-Gym
          </span>
        </div>

        {/* Controls */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border shadow-md backdrop-blur-md"
          style={{
            background: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.55)',
            borderColor: 'var(--border)',
          }}
        >
          <LanguageSwitcher />
          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
          <ThemeToggle />
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-10">

        {/* Hero section */}
        <div className="text-center mb-10 animate-fade-in">

          {/* Logo icon */}
          <div className="inline-flex items-center justify-center mb-5">
            <div
              className="w-20 h-20 rounded-3xl shadow-[0_0_40px_rgba(22,201,104,0.35)] flex items-center justify-center relative transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(22,201,104,0.5)] cursor-default"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}
            >
              <Dumbbell className="w-10 h-10 text-white" />
              {/* ring glow */}
              <div className="absolute -inset-1 rounded-3xl opacity-20 blur-sm" style={{ background: 'var(--accent)' }} />
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-none"
            style={{ color: 'var(--text-strong)' }}
          >
            I-<span style={{ color: 'var(--accent)' }}>Gym</span>
          </h1>

          {/* Tagline */}
          <p
            className="text-sm md:text-base max-w-md mx-auto font-medium leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('welcome.tagline') || "Repoussez vos limites avec notre plateforme fitness connectée nouvelle génération."}
          </p>
        </div>

        {/* CTA card */}
        <div
          className="w-full max-w-sm rounded-3xl p-7 mb-8 shadow-xl animate-scale-up border backdrop-blur-xl"
          style={{
            background: isDark ? 'rgba(30,41,59,0.75)' : 'rgba(255,255,255,0.78)',
            borderColor: 'var(--border)',
            boxShadow: isDark
              ? '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 20px 50px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest text-center mb-6 flex items-center justify-center gap-2"
            style={{ color: 'var(--text-dim)' }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            {t('welcome.ready') || "Prêt pour l'entraînement ?"}
          </p>

          <div className="space-y-3">
            {/* Login button */}
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-2xl py-3.5 text-sm font-bold flex items-center gap-3 px-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                color: '#fff',
                boxShadow: '0 6px 20px var(--shadow-accent-lg)',
              }}
            >
              <LogIn className="w-4 h-4 flex-shrink-0" />
              <span>{t('welcome.connect') || "Se connecter"}</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-dim)' }}>ou</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            {/* Register button */}
            <button
              onClick={() => navigate('/register')}
              className="w-full rounded-2xl py-3.5 text-sm font-bold flex items-center gap-3 px-5 border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                color: 'var(--text)',
                borderColor: 'var(--border)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
            >
              <UserPlus className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-dim)' }} />
              <span>{t('welcome.register') || "Créer un compte"}</span>
              <ChevronRight className="w-4 h-4 ml-auto" style={{ color: 'var(--text-dim)' }} />
            </button>
          </div>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          {[
            { icon: ShieldCheck, label: t('welcome.realtime') || 'Suivi Temps Réel', color: 'var(--accent)', glow: 'var(--accent-muted)' },
            { icon: Trophy, label: t('welcome.gamification') || 'Gamification', color: 'var(--info)', glow: 'var(--info-muted)' },
            { icon: Dumbbell, label: t('welcome.premium') || 'Cours Premium', color: 'var(--warning)', glow: 'var(--warning-muted)' },
          ].map(({ icon: Icon, label, color, glow }, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all duration-300 hover:-translate-y-1 cursor-default backdrop-blur-md"
              style={{
                background: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.6)',
                borderColor: 'var(--border)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 8px 20px ${glow}` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <Icon className="w-5 h-5 mb-1.5" style={{ color }} />
              <span className="text-[9px] font-bold uppercase tracking-wider leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 text-center py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          I-Gym v2.0 — Hackathon Edition
        </p>
      </footer>
    </div>
  )
}

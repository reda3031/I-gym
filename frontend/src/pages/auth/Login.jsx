import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Dumbbell, Mail, Lock, Eye, EyeOff, Loader2, Zap, ArrowLeft, ShieldCheck, Trophy } from 'lucide-react'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { LanguageSwitcher } from '../../components/ui'
import { useTranslation } from '../../context/TranslationContext'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'super_admin') navigate('/superadmin')
      else if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'coach') navigate('/coach')
      else navigate('/adherent')
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden transition-colors duration-500" style={{ background: 'var(--bg)' }}>

      {/* ── LEFT PANEL : Gym Visual ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("/gym_landing_bg.png")' }}
        />
        {/* Overlay adaptatif */}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(9,13,22,0.7) 0%, rgba(15,23,42,0.55) 100%)'
              : 'linear-gradient(135deg, rgba(15,23,42,0.65) 0%, rgba(9,13,22,0.8) 100%)',
          }}
        />
        {/* Content over photo */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}>
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">I-Gym</span>
          </div>

          {/* Hero text */}
          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4 drop-shadow-lg">
              Votre club de<br />
              <span style={{ color: 'var(--accent)' }}>fitness connecté</span>
            </h2>
            <p className="text-sm text-white/70 font-medium leading-relaxed mb-8 max-w-xs">
              {t('welcome.tagline') || 'Repoussez vos limites avec notre plateforme fitness connectée nouvelle génération.'}
            </p>

            {/* Feature mini-pills */}
            <div className="flex flex-col gap-3">
              {[
                { icon: ShieldCheck, text: t('welcome.realtime') || 'Suivi Temps Réel' },
                { icon: Trophy,      text: t('welcome.gamification') || 'Gamification & Badges' },
                { icon: Dumbbell,    text: t('welcome.premium') || 'Cours Premium' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-2.5 text-white/80">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(22,201,104,0.25)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-xs font-semibold">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">
            I-Gym v2.0 — Hackathon Winner Edition
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL : Login Form ── */}
      <div className="flex-1 flex flex-col relative">

        {/* Subtle texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: isDark
              ? 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Accent glow */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-30" style={{ background: 'var(--accent-muted)' }} />

        {/* Header controls */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('auth.backToWelcome') || 'Retour'}</span>
          </button>
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border shadow-sm backdrop-blur-sm"
            style={{ background: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.7)', borderColor: 'var(--border)' }}
          >
            <LanguageSwitcher />
            <div style={{ width: '1px', height: '22px', background: 'var(--border)' }} />
            <ThemeToggle />
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 relative z-10">
          <div className="w-full max-w-sm">

            {/* Logo mobile only */}
            <div className="flex lg:hidden items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}>
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight" style={{ color: 'var(--text-strong)' }}>I-Gym</span>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: 'var(--text-strong)' }}>
                {t('auth.login') || 'Connexion'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('auth.loginSubtitle') || 'Connectez-vous à votre espace I-Gym'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl text-sm flex items-center gap-2.5 border" style={{ background: 'var(--danger-muted)', borderColor: 'var(--danger-border-muted)', color: 'var(--danger)' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                  {t('auth.email') || 'Adresse e-mail'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('auth.placeholder.email') || 'vous@exemple.com'}
                    required
                    className="input-dark w-full rounded-xl pl-11 pr-4 py-3 text-sm"
                    style={{ background: 'var(--bg-input)' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                  {t('auth.password') || 'Mot de passe'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="input-dark w-full rounded-xl pl-11 pr-11 py-3 text-sm"
                    style={{ background: 'var(--bg-input)' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-dim)' }}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                  color: '#fff',
                  boxShadow: '0 6px 20px var(--shadow-accent-lg)',
                }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? (t('auth.loginLoading') || 'Connexion...') : (t('auth.login') || 'Se connecter')}
              </button>
            </form>

            {/* Register link */}
            <div className="mt-6 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
              {t('auth.alreadyRegistered') || 'Pas encore de compte ?'}{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-bold transition-colors hover:opacity-80"
                style={{ color: 'var(--accent)' }}
              >
                {t('auth.register') || "S'inscrire"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

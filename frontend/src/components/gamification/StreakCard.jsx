import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useTranslation } from '../../context/TranslationContext'

const levelConfig = {
  bronze:   { color: 'from-amber-700 to-amber-900', text: 'text-amber-100', labelKey: 'level.bronze',   emoji: '🥉' },
  silver:   { color: 'from-slate-400 to-slate-600', text: 'text-slate-100', labelKey: 'level.silver',   emoji: '🥈' },
  gold:     { color: 'from-yellow-500 to-amber-600', text: 'text-yellow-50',   labelKey: 'level.gold',     emoji: '🥇' },
  platinum: { color: 'from-cyan-400 to-blue-500',   text: 'text-cyan-50', labelKey: 'level.platinum', emoji: '💎' },
}

export default function StreakCard({ achievements, onNewBadge }) {
  const { t } = useTranslation()
  const confettiRef = useRef(false)

  const {
    streak_days = 0,
    total_sessions = 0,
    level = 'bronze',
    next_level,
    sessions_for_next,
    progress_to_next = 0,
    badges = [],
  } = achievements || {}

  const lvl = levelConfig[level] || levelConfig.bronze

  // Lancer confetti si nouveau badge
  useEffect(() => {
    if (badges.length > 0 && !confettiRef.current) {
      confettiRef.current = true
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#f59e0b', '#3b82f6', '#ec4899'],
      })
    }
  }, [badges.length])

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      {/* Header streak */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-muted mb-1">🔥 {t('dashboard.adherent.streak')}</h3>
          <div className="flex items-end gap-2">
            <span className="flame-icon text-4xl">🔥</span>
            <span className="text-5xl font-black text-text">{streak_days}</span>
            <span className="text-text-muted text-sm mb-1">{t('dashboard.adherent.days')}</span>
          </div>
        </div>

        {/* Niveau */}
        <div className={`flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br ${lvl.color}`}>
          <span className="text-3xl">{lvl.emoji}</span>
          <span className={`text-xs font-bold mt-1 ${lvl.text}`}>{t(lvl.labelKey)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-hover rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-accent">{total_sessions}</p>
          <p className="text-xs text-text-muted mt-0.5">{t('dashboard.adherent.totalSessions')}</p>
        </div>
        <div className="bg-bg-hover rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-warning">{streak_days}</p>
          <p className="text-xs text-text-muted mt-0.5">{t('dashboard.adherent.consecutiveDays')}</p>
        </div>
      </div>

      {/* Progression vers niveau suivant */}
      {next_level && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-text-muted">
              {t('dashboard.adherent.toward')} {t(levelConfig[next_level]?.labelKey)} {levelConfig[next_level]?.emoji}
            </span>
            <span className="text-xs font-semibold text-accent">
              {total_sessions}/{sessions_for_next} {t('dashboard.adherent.sessions')}
            </span>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full progress-bar-fill transition-all"
              style={{ width: `${progress_to_next}%` }}
            />
          </div>
          <p className="text-xs text-text-dim mt-1 text-right">{progress_to_next}%</p>
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-muted mb-3">🏅 {t('dashboard.adherent.badgesUnlocked')}</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, i) => (
              <div
                key={badge.type}
                className="badge-pop flex items-center gap-1.5 px-3 py-1.5 bg-bg-hover border border-border rounded-full text-xs font-medium text-text cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}
                title={`Obtenu le ${badge.earned_at}`}
              >
                {badge.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { levelTextClass } from '../../constants/levels'
import { useTranslation } from '../../context/TranslationContext'

/**
 * WOW Feature #7 — Leaderboard avec podium visuel
 */
export default function LeaderboardWidget({ data, period, onPeriodChange }) {
  const { t } = useTranslation()
  const { leaderboard = [], my_rank } = data || {}

  const podiumClass = (rank) => {
    if (rank === 1) return 'podium-gold border'
    if (rank === 2) return 'podium-silver border'
    if (rank === 3) return 'podium-bronze border'
    return 'bg-bg-hover border border-border'
  }

  const medalEmoji = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const levelColor = (level) => levelTextClass[level] || 'text-text-muted'

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text flex items-center gap-2">
          🏆 <span>{t('dashboard.adherent.topMembers')}</span>
        </h3>
        {my_rank && (
          <span className="text-xs px-2 py-1 surface-accent text-accent rounded-full font-medium">
            {t('leaderboard.myRank')} : #{my_rank}
          </span>
        )}
      </div>

      {/* Filtres période */}
      {onPeriodChange && (
        <div className="flex gap-2 mb-4">
          {['week', 'month', 'all'].map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all
                ${period === p
                  ? 'bg-accent text-on-accent shadow-lg shadow-accent'
                  : 'bg-bg-hover text-text-muted hover:text-text'
                }`}
            >
              {p === 'week' ? t('leaderboard.week') : p === 'month' ? t('leaderboard.month') : t('leaderboard.all')}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      <div className="space-y-2">
        {leaderboard.slice(0, 5).map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all
              ${podiumClass(entry.rank)}
              ${entry.is_me ? 'ring-1 ring-accent' : ''}`}
          >
            {/* Rang */}
            <span className={`text-lg font-black w-8 text-center flex-shrink-0
              ${entry.rank <= 3 ? 'text-xl' : 'text-sm text-text-muted'}`}>
              {medalEmoji(entry.rank)}
            </span>

            {/* Avatar */}
            <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-dark rounded-full flex items-center justify-center text-on-accent text-sm font-bold flex-shrink-0">
              {entry.name?.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${entry.is_me ? 'text-accent' : 'text-text'}`}>
                {entry.name} {entry.is_me && ` (${t('leaderboard.me')})`}
              </p>
              <p className={`text-xs ${levelColor(entry.level)}`}>
                {entry.streak_days}🔥 · {t('level.' + entry.level)}
              </p>
            </div>

            {/* Sessions */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-accent">{entry.sessions_count}</p>
              <p className="text-xs text-text-dim">{t('leaderboard.sessions')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import api from '../services/api'
import { usePolling } from '../hooks/usePolling'
import LeaderboardWidget from '../components/gamification/LeaderboardWidget'
import { Trophy } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'

export default function LeaderboardPage() {
  const { t } = useTranslation()
  const [data, setData]     = useState(null)
  const [period, setPeriod] = useState('week')

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/leaderboard?period=${period}`)
      setData(res)
    } catch {}
  }, [period])

  usePolling(fetchLeaderboard, 15000)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-3">
          <Trophy className="w-6 h-6 text-warning" /> {t('leaderboard.title')}
        </h1>
        <p className="text-text-muted text-sm mt-0.5">{t('leaderboard.subtitle')}</p>
      </div>

      {data?.leaderboard?.length >= 3 && (
        <div className="flex items-end justify-center gap-4 py-6">
          {/* 2e place */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 avatar-podium-silver rounded-full flex items-center justify-center text-2xl font-black text-on-accent shadow-xl">
              {data.leaderboard[1].name?.charAt(0)}
            </div>
            <div className="podium-block-silver rounded-xl px-3 py-2 text-center h-20 flex flex-col justify-end min-w-[5rem]">
              <p className="text-xs font-bold text-podium-silver truncate max-w-20">{data.leaderboard[1].name}</p>
              <p className="text-xs text-text-dim">{data.leaderboard[1].sessions_count} {t('leaderboard.sessions')}</p>
            </div>
            <span className="text-2xl">🥈</span>
          </div>
          {/* 1re place */}
          <div className="flex flex-col items-center gap-2 -mt-6">
            <div className="w-[72px] h-[72px] avatar-podium-gold rounded-full flex items-center justify-center text-3xl font-black text-on-accent shadow-2xl shadow-accent animate-pulse-green">
              {data.leaderboard[0].name?.charAt(0)}
            </div>
            <div className="podium-block-gold rounded-xl px-4 py-3 text-center h-24 flex flex-col justify-end min-w-[6rem]">
              <p className="text-sm font-bold text-podium-gold truncate max-w-24">{data.leaderboard[0].name}</p>
              <p className="text-xs text-text-dim">{data.leaderboard[0].sessions_count} {t('leaderboard.sessions')}</p>
              <p className="text-xs text-warning">{data.leaderboard[0].streak_days}🔥</p>
            </div>
            <span className="text-3xl">🥇</span>
          </div>
          {/* 3e place */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 avatar-podium-bronze rounded-full flex items-center justify-center text-xl font-black text-on-accent shadow-lg">
              {data.leaderboard[2].name?.charAt(0)}
            </div>
            <div className="podium-block-bronze rounded-xl px-3 py-2 text-center h-16 flex flex-col justify-end min-w-[5rem]">
              <p className="text-xs font-bold text-podium-bronze truncate max-w-20">{data.leaderboard[2].name}</p>
              <p className="text-xs text-text-dim">{data.leaderboard[2].sessions_count} {t('leaderboard.sessions')}</p>
            </div>
            <span className="text-xl">🥉</span>
          </div>
        </div>
      )}

      <LeaderboardWidget data={data} period={period} onPeriodChange={setPeriod} />
    </div>
  )
}

import { useState, useCallback, Fragment } from 'react'
import api from '../../services/api'
import { usePolling } from '../../hooks/usePolling'
import { useChartTheme } from '../../hooks/useChartTheme'
import { getLevelBadgeClass } from '../../constants/levels'
import OccupancyGauge from '../../components/charts/OccupancyGauge'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { Users, Calendar, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

export default function AdminDashboard() {
  const { t, lang } = useTranslation()
  const chart = useChartTheme()
  const [kpis, setKpis]                 = useState(null)
  const [rooms, setRooms]               = useState([])
  const [alerts, setAlerts]             = useState([])

  const [recentMembers, setRecentMembers] = useState([])
  const [heatmap, setHeatmap]           = useState([])
  const [lastUpdate, setLastUpdate]     = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, roomsRes, alertsRes, membersRes, heatmapRes] = await Promise.all([
        api.get('/admin/kpis'),
        api.get('/rooms/occupancy'),
        api.get('/admin/alerts'),
        api.get('/admin/recent-members'),
        api.get('/admin/heatmap'),
      ])
      setKpis(kpisRes.data)
      setRooms(roomsRes.data)
      setAlerts(alertsRes.data.filter(a => !a.is_read))
      setRecentMembers(membersRes.data)
      setHeatmap(heatmapRes.data || [])
      setLastUpdate(new Date())
    } catch {}
  }, [])

  // Polling 5 secondes — temps réel
  usePolling(fetchAll, 5000)

  const markAlertRead = async (id) => {
    await api.patch(`/admin/alerts/${id}/read`)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const KPICard = ({ icon: Icon, label, value, color, sub }) => (
    <div className="glass-card rounded-2xl p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted font-medium mb-2">{label}</p>
          <p className={`text-3xl font-black ${color}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-text-dim mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color.replace('text-', 'from-')}/20 to-transparent`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('admin.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('admin.subtitle')}</p>
        </div>
      </div>

      {/* Alertes système */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-4 surface-danger border border-danger-muted rounded-xl animate-slide-in">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-danger">{alert.type?.toUpperCase()}</p>
                  <p className="text-xs text-text-muted">{alert.message}</p>
                </div>
              </div>
              <button onClick={() => markAlertRead(alert.id)}
                className="text-xs text-danger hover:text-danger px-3 py-1.5 border border-danger-muted rounded-lg transition-all">
                {t('admin.action.process')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users}         label={t('admin.activeMembers')}    value={kpis?.active_members}  color="text-accent"   sub={t('admin.activeMembersSub')} />
        <KPICard icon={Calendar}      label={t('admin.coursesToday')}   value={kpis?.courses_today}   color="text-info"     sub={t('admin.coursesTodaySub')} />
        <KPICard icon={AlertTriangle} label={t('admin.unreadAlerts')}    value={kpis?.unread_alerts}   color="text-danger"   sub={t('admin.unreadAlertsSub')} />
        <KPICard icon={TrendingUp}    label={t('admin.monthlyRev')}     value={kpis?.monthly_revenue ? `${kpis.monthly_revenue} MAD` : '—'} color="text-warning" sub={t('admin.monthlyRevSub')} />
      </div>

      {/* Occupation temps réel — WOW Feature #2 */}
      <div>
        <h2 className="text-base font-bold text-text mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          {t('admin.occupancy')}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map(room => (
            <OccupancyGauge key={room.id} room={room} />
          ))}
        </div>
      </div>

      {/* Graphique */}
      <div className="grid grid-cols-1 gap-6">
        {/* BarChart Recharts : réservations 7 jours */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-text mb-4">{t('admin.chartTitle')}</h3>
          {kpis?.reservations_per_day && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kpis.reservations_per_day}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="date" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelStyle={{ color: chart.tick }}
                  itemStyle={{ color: chart.bar }}
                />
                <Bar dataKey="count" fill={chart.bar} radius={[6, 6, 0, 0]} name="Séances" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Heatmap Heures de pointe */}
      <div className="glass-card rounded-2xl p-5 overflow-x-auto">
        <h3 className="font-semibold text-text mb-4">Heatmap Fréquentation</h3>
        <div className="min-w-[700px] grid grid-cols-[auto_repeat(17,_1fr)] gap-1 text-xs text-center">
          <div className="text-left font-bold text-text-dim pr-4 py-1">Jour \ Heure</div>
          {Array.from({ length: 17 }).map((_, i) => (
            <div key={i} className="text-text-dim py-1">{i + 6}h</div>
          ))}
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((dayName, dayIndex) => (
            <Fragment key={dayIndex}>
              <div className="text-left font-bold text-text-dim pr-4 py-1.5">{dayName}</div>
              {Array.from({ length: 17 }).map((_, hourIndex) => {
                const hour = hourIndex + 6
                // dayIndex in heatmap is 1=Sun, 2=Mon... wait, DAYOFWEEK in MySQL: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
                // Let's map our dayIndex (0=Lun, 6=Dim) to MySQL day (2=Mon...1=Sun)
                const mysqlDay = dayIndex === 6 ? 1 : dayIndex + 2
                const val = heatmap.find(h => h.day === mysqlDay && h.hour === hour)?.count || 0
                // Simple color scale: 0=transparent, max=accent
                let opacity = 0.1
                if (val > 0) opacity = 0.3
                if (val > 5) opacity = 0.6
                if (val > 10) opacity = 0.8
                if (val > 20) opacity = 1.0
                return (
                  <div key={hourIndex} className="rounded-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer" 
                       style={{ backgroundColor: `rgba(99, 102, 241, ${opacity})` }} 
                       title={`${val} présences`}>
                    {val > 0 && <span className="text-[10px] text-white/90 font-bold">{val}</span>}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Dernières inscriptions */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-text mb-4">{t('admin.recentMembers')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-dim border-b border-border">
                <th className="text-left pb-3 font-medium">{t('admin.table.name')}</th>
                <th className="text-left pb-3 font-medium">{t('admin.table.email')}</th>
                <th className="text-left pb-3 font-medium">{t('admin.table.level')}</th>
                <th className="text-left pb-3 font-medium">{t('admin.table.sessions')}</th>
                <th className="text-left pb-3 font-medium">{t('admin.table.sub')}</th>
                <th className="text-left pb-3 font-medium">{t('admin.table.joined')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentMembers.map(m => (
                <tr key={m.id} className="hover:bg-bg-hover transition-colors">
                  <td className="py-3 font-medium text-text">{m.name}</td>
                  <td className="py-3 text-text-muted">{m.email}</td>
                  <td className="py-3 capitalize">
                    <span className={getLevelBadgeClass(m.level)}>
                      {m.level}
                    </span>
                  </td>
                  <td className="py-3 text-accent font-semibold">{m.total_sessions}</td>
                  <td className="py-3 capitalize text-text-muted">{m.subscription || '—'}</td>
                  <td className="py-3 text-text-dim">{m.joined_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

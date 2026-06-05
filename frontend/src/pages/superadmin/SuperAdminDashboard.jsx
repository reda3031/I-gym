import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import api from '../../services/api'
import {
  Building2, Users, Flame, LayoutDashboard,
  Loader2, Dumbbell, ShieldAlert, BarChart3, PieChart as PieIcon
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

export default function SuperAdminDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/super-admin/gyms')
      .then(({ data }) => {
        setData(data)
      })
      .catch((err) => {
        console.error(err)
        setError(t('error.server'))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [t])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text">
        <div className="text-center">
          <Loader2 className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-card rounded-2xl border border-danger-muted text-center text-text">
        <ShieldAlert className="w-12 h-12 text-danger mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">{t('common.error')}</h3>
        <p className="text-text-muted text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-accent rounded-xl px-4 py-2 text-sm">
          {t('common.retry') || 'Réessayer'}
        </button>
      </div>
    )
  }

  const gyms = data?.gyms || []
  const mostActive = data?.most_active
  const totalGyms = data?.total_gyms || 0
  const totalMembers = data?.total_members_all || 0
  const totalActiveNow = gyms.reduce((acc, g) => acc + (g.active_now || 0), 0)

  // Chart data
  const memberData = gyms.map(g => ({
    name: g.name,
    membres: g.total_members,
    actifs: g.active_members
  }))

  const occupancyData = gyms.map(g => ({
    name: g.name,
    value: g.active_now || 0
  })).filter(g => g.value > 0)

  const COLORS = ['#6366f1', '#f97316', '#10b981', '#a855f7', '#ec4899']

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-card/30 p-5 rounded-2xl border border-border/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-black text-text uppercase tracking-tight">
              {t('nav.super_admin') || 'Super Admin'}
            </h1>
          </div>
          <p className="text-text-muted text-xs font-semibold mt-1">
            {t('superadmin.dashboard.subtitle') || 'Visualisation globale de la franchise I-Gym SaaS'}
          </p>
        </div>
        <div className="text-xs bg-accent/10 border border-accent/20 rounded-xl px-3 py-1.5 font-bold text-accent">
          {user?.name} ({user?.email})
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Gyms */}
        <div className="glass-card rounded-2xl p-5 border border-border/50 flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-[10px] text-text-dim uppercase font-bold tracking-wider leading-none">{t('superadmin.dashboard.activeClubs') || 'Clubs Actifs'}</p>
            <p className="text-2xl font-black text-text mt-1">{totalGyms}</p>
          </div>
        </div>

        {/* Total Members */}
        <div className="glass-card rounded-2xl p-5 border border-border/50 flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-text-dim uppercase font-bold tracking-wider leading-none">{t('superadmin.dashboard.totalMembers') || 'Total Adhérents'}</p>
            <p className="text-2xl font-black text-text mt-1">{totalMembers}</p>
          </div>
        </div>

        {/* Active Now */}
        <div className="glass-card rounded-2xl p-5 border border-border/50 flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-text-dim uppercase font-bold tracking-wider leading-none">{t('superadmin.dashboard.activeNow') || 'Présents en Direct'}</p>
            <p className="text-2xl font-black text-text mt-1">{totalActiveNow}</p>
          </div>
        </div>

        {/* Most Active Gym */}
        <div className="glass-card rounded-2xl p-5 border border-border/50 flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Dumbbell className="w-6 h-6 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-text-dim uppercase font-bold tracking-wider leading-none">{t('superadmin.dashboard.mostActiveClub') || 'Club le plus Actif'}</p>
            <p className="text-base font-extrabold text-text mt-1 truncate">
              {mostActive ? mostActive.name : 'N/A'}
            </p>
            {mostActive && (
              <p className="text-[10px] text-emerald-500 font-bold mt-0.5">
                {mostActive.active_now} {t('superadmin.dashboard.activePresent') || 'présents'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members Distribution Chart */}
        <div className="glass-card rounded-2xl p-6 border border-border/50 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-text text-xs uppercase tracking-wide">
              {t('superadmin.dashboard.membersChartTitle') || 'Répartition des Adhérents par Club'}
            </h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    color: 'var(--text)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="membres" fill="#6366f1" radius={[4, 4, 0, 0]} name={t('superadmin.dashboard.totalMembersLegend') || "Total Membres"} />
                <Bar dataKey="actifs" fill="#10b981" radius={[4, 4, 0, 0]} name={t('superadmin.dashboard.activeSub') || "Abonnements Actifs"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Attendance Donut */}
        <div className="glass-card rounded-2xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-text text-xs uppercase tracking-wide">
              {t('superadmin.dashboard.realtimePresence') || 'Présences en Temps Réel'}
            </h3>
          </div>
          <div className="h-72 w-full flex flex-col justify-between">
            {occupancyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-text-muted text-xs">
                <Dumbbell className="w-8 h-8 text-text-dim mb-2 animate-bounce" />
                {t('superadmin.dashboard.noActivePresent') || 'Aucun adhérent dans les salles en ce moment.'}
              </div>
            ) : (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={occupancyData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {occupancyData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border)',
                          borderRadius: '12px',
                          color: 'var(--text)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {occupancyData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-text-muted truncate max-w-[80px]">{item.name}</span>
                      <span className="text-text font-bold">({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


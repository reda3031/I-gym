import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { useTranslation } from '../../context/TranslationContext'
import { Users, Search, Loader2 } from 'lucide-react'
import { getLevelBadgeClass } from '../../constants/levels'

export default function AdminMembersPage() {
  const { t, lang } = useTranslation()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData()
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [search])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/members', { params: { search } })
      // Assuming pagination: res.data.data
      setMembers(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-accent" />
          <h1 className="text-2xl font-bold text-text">{t('nav.members')}</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-bg-card/20 p-4 rounded-2xl border border-border/40 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            placeholder={t('admin.members.searchPlaceholder') || 'Rechercher par nom, e-mail...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-input/50 border border-border/40 focus:border-accent text-text text-sm rounded-xl focus:outline-none transition-colors"
          />
        </div>
      </div>

      {loading && members.length === 0 ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
        </div>
      ) : error ? (
        <div className="p-4 bg-danger/10 text-danger rounded-xl">{error}</div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-bg-input/30 text-text-dim text-xs uppercase tracking-wider border-b border-border/50">
                <th className="px-6 py-4 font-bold">{t('admin.table.name') || 'Membre'}</th>
                <th className="px-6 py-4 font-bold">{t('admin.table.level') || 'Niveau'}</th>
                <th className="px-6 py-4 font-bold">{t('admin.table.sub') || 'Abonnement'}</th>
                <th className="px-6 py-4 font-bold text-center">{t('admin.table.sessions') || 'Sessions'}</th>
                <th className="px-6 py-4 font-bold text-right">{t('admin.table.joined') || 'Inscrit le'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-text">{m.name}</p>
                    <p className="text-xs text-text-muted">{m.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={getLevelBadgeClass(m.level)}>{m.level}</span>
                  </td>
                  <td className="px-6 py-4">
                    {m.active_subscription ? (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-xs font-bold uppercase">
                        {t('admin.members.active') || 'Actif'} ({m.active_subscription.plan})
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-danger/10 text-danger rounded-md text-xs font-bold uppercase">
                        {t('admin.members.inactive') || 'Inactif'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-accent">{m.total_sessions}</td>
                  <td className="px-6 py-4 text-right text-text-muted">
                    {new Date(m.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : (lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : (lang === 'de' ? 'de-DE' : 'fr-FR'))))}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-text-muted">{t('admin.members.noMembers') || 'Aucun membre trouvé.'}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

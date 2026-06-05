import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { useTranslation } from '../../context/TranslationContext'
import { ClipboardList, Loader2, AlertTriangle, Users } from 'lucide-react'
import { usePolling } from '../../hooks/usePolling'

export default function AdminReservationsPage() {
  const { t } = useTranslation()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      const res = await api.get('/admin/reservations')
      setCourses(res.data || [])
    } catch (err) {
      setError(err.response?.data?.message || t('common.errLoad') || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Rafraîchir toutes les 10 secondes (live)
  usePolling(fetchData, 10000)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-warning" />
        <h1 className="text-2xl font-bold text-text">{t('admin.reservations.title') || 'Réservations en Direct'}</h1>
      </div>

      {loading && courses.length === 0 ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
        </div>
      ) : error ? (
        <div className="p-4 bg-danger/10 text-danger rounded-xl">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="glass-card p-5 rounded-2xl border border-border/50 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-text">{course.name}</h3>
                  <p className="text-sm text-text-muted">{course.type} • {course.coach}</p>
                  <p className="text-xs text-text-dim mt-1">{course.starts_at} - {course.ends_at} | {course.room}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  course.is_full ? 'bg-danger/10 text-danger' : 
                  course.occupancy_pct >= 80 ? 'bg-warning/10 text-warning' : 
                  'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {course.occupancy_pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-bg-input rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${
                    course.is_full ? 'bg-danger' : 
                    course.occupancy_pct >= 80 ? 'bg-warning' : 'bg-emerald-500'
                  }`} 
                  style={{ width: `${Math.min(100, course.occupancy_pct)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs mb-4">
                <span className="font-medium text-text">{course.current_reservations} {t('admin.reservations.booked') || 'réservés'}</span>
                <span className="text-text-muted">{course.spots_remaining} {t('admin.reservations.freeSpots') || 'places libres'}</span>
              </div>

              {/* Alert if full or almost full */}
              {course.is_full && (
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-danger bg-danger/10 p-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" /> {t('admin.reservations.full') || 'Cours Complet !'}
                </div>
              )}
              {!course.is_full && course.occupancy_pct >= 90 && (
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-warning bg-warning/10 p-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" /> {t('admin.reservations.almostFull') || 'Bientôt complet !'}
                </div>
              )}

              {/* Member list */}
              <div className="mt-auto flex-1 bg-bg-input/30 rounded-xl p-3 max-h-48 overflow-y-auto">
                <h4 className="text-xs font-bold text-text-dim uppercase mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t('admin.reservations.registered') || 'Inscrits'}
                </h4>
                {course.members?.length > 0 ? (
                  <ul className="space-y-2">
                    {course.members.map(m => (
                      <li key={m.id} className="flex justify-between items-center text-sm">
                        <span className="text-text font-medium">{m.name}</span>
                        <span className="text-xs text-text-muted capitalize">{m.level}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted text-center py-2">{t('admin.reservations.noReservations') || 'Aucune réservation'}</p>
                )}
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full text-center py-10 text-text-muted">
              {t('admin.reservations.noClassesToday') || 'Aucun cours programmé pour aujourd\'hui.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

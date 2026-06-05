import { useState, useCallback, useMemo } from 'react'
import api from '../services/api'
import { usePolling } from '../hooks/usePolling'
import { useAuth } from '../context/AuthContext'
import { Calendar, CheckCircle, Users, Loader2 } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'

const START_HOUR = 6
const END_HOUR = 22
const HOUR_HEIGHT = 80 // pixels par heure

export default function PlanningPage() {
  const { t, lang } = useTranslation()
  const { user } = useAuth()

  // Timezone-safe local date parser
  const parseDateAsLocal = (str) => {
    if (!str) return new Date()
    const tStr = String(str).replace(' ', 'T')
    const localStr = tStr.split('Z')[0].split('+')[0]
    const d = new Date(localStr)
    return isNaN(d.getTime()) ? new Date(tStr) : d
  }

  const [courses, setCourses]       = useState([])
  const [hourFilter, setHourFilter] = useState('all')
  const [loading, setLoading]       = useState({})
  const [reserved, setReserved]     = useState(new Set())
  const [toast, setToast]           = useState(null)
  const [selectedCourseForModal, setSelectedCourseForModal] = useState(null)

  const handleCardClick = (course) => {
    if (user?.role !== 'adherent') return
    const startsAt = parseDateAsLocal(course.starts_at)
    const isPast = startsAt < new Date()
    if (isPast) return
    setSelectedCourseForModal(course)
  }

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const [reservationMap, setReservationMap] = useState({})

  const fetchCourses = useCallback(async () => {
    try {
      const [coursesRes, reservationsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/reservations/mine')
      ])
      setCourses(coursesRes.data)
      const initiallyReserved = new Set(coursesRes.data.filter(c => c.is_reserved).map(c => c.id))
      setReserved(initiallyReserved)

      const mapping = {}
      reservationsRes.data.forEach(r => {
        if (r.course_id) {
          mapping[r.course_id] = r.id
        }
      })
      setReservationMap(mapping)
    } catch {}
  }, [])

  usePolling(fetchCourses, 5000)

  const reserve = async (courseId) => {
    setLoading(prev => ({ ...prev, [courseId]: true }))
    try {
      const res = await api.post('/reservations', { course_id: courseId })
      setReserved(prev => new Set([...prev, courseId]))
      if (res.data.reservation) {
        setReservationMap(prev => ({ ...prev, [courseId]: res.data.reservation.id }))
      }
      await fetchCourses()
      showToast(t('planning.toastBooked') || '✅ Réservation confirmée !')
    } catch (err) {
      showToast(err.response?.data?.message || t('planning.toastBookError') || 'Erreur de réservation', false)
    } finally {
      setLoading(prev => ({ ...prev, [courseId]: false }))
    }
  }

  const cancelReservation = async (courseId) => {
    const reservationId = reservationMap[courseId]
    if (!reservationId) {
      showToast(t('planning.toastCancelNotFound') || 'Impossible de trouver la réservation correspondante.', false)
      return
    }
    setLoading(prev => ({ ...prev, [courseId]: true }))
    try {
      await api.delete(`/reservations/${reservationId}`)
      setReserved(prev => {
        const next = new Set(prev)
        next.delete(courseId)
        return next
      })
      await fetchCourses()
      showToast(t('planning.toastCancelled') || 'Réservation annulée avec succès.')
    } catch (err) {
      showToast(err.response?.data?.message || t('planning.toastCancelError') || 'Erreur lors de l\'annulation', false)
    } finally {
      setLoading(prev => ({ ...prev, [courseId]: false }))
    }
  }

  // Générer les 7 prochains jours
  const next7Days = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [])

  // Grouper les cours par date
  const coursesByDate = useMemo(() => {
    const grouped = {}
    next7Days.forEach(d => {
      const dateStr = d.toISOString().split('T')[0]
      grouped[dateStr] = []
    })

    courses.forEach(course => {
      const startDate = parseDateAsLocal(course.starts_at)
      const dateStr = startDate.toISOString().split('T')[0]
      const hour = startDate.getHours()

      // Appliquer le filtre par heure
      if (hourFilter !== 'all') {
        const targetHour = parseInt(hourFilter, 10)
        if (hour !== targetHour) return
      }

      if (grouped[dateStr]) {
        grouped[dateStr].push(course)
      }
    })
    return grouped
  }, [courses, next7Days, hourFilter])

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto h-[calc(100vh-120px)] flex flex-col">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 toast px-5 py-3 rounded-xl font-medium text-sm shadow-2xl
          ${toast.ok ? 'bg-accent text-on-accent' : 'bg-danger text-on-accent'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-3">
            <Calendar className="w-6 h-6 text-accent" /> {t('planning.title') || 'Emploi du temps'}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">{t('planning.subtitle') || 'Réservez vos séances de la semaine'}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-bg-card p-1.5 rounded-xl border border-black/10 dark:border-white/10 shadow-sm">
          <span className="text-sm font-semibold text-text-muted pl-2">
            {t('planning.filterByHour') || 'Filtrer par heure :'}
          </span>
          <select 
            value={hourFilter} 
            onChange={(e) => setHourFilter(e.target.value)}
            className="select-modern"
          >
            <option value="all">{t('planning.allHours') || 'Toutes les heures'}</option>
            {hours.map(h => (
              <option key={h} value={h}>{h}h00</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-bg-card border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Header des Jours */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-black/10 dark:border-white/10 bg-bg-hover shrink-0">
          <div className="border-r border-black/10 dark:border-white/10"></div> {/* Espace pour l'axe des heures */}
          {next7Days.map((date, idx) => {
            const isToday = idx === 0
            const dayName = date.toLocaleDateString(lang === 'ar' ? 'ar-MA' : (lang === 'en' ? 'en-US' : 'fr-FR'), { weekday: 'short' })
            const dayNum = date.getDate()
            return (
              <div key={idx} className={`text-center py-3 border-r border-black/10 dark:border-white/10 last:border-0 ${isToday ? 'bg-accent/10' : ''}`}>
                <p className={`text-xs font-bold uppercase ${isToday ? 'text-accent' : 'text-text-muted'}`}>{dayName}</p>
                <p className={`text-xl font-black mt-0.5 ${isToday ? 'text-accent' : 'text-text'}`}>{dayNum}</p>
              </div>
            )
          })}
        </div>

        {/* Grille du Calendrier Absolute */}
        <div className="flex-1 overflow-y-auto relative bg-bg">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px] relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
            
            {/* Lignes horizontales des heures */}
            <div className="absolute inset-0 pointer-events-none">
              {hours.map(hour => (
                <div key={hour} className="border-b border-black/5 dark:border-white/5 absolute w-full flex" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                  <div className="w-[60px] border-r border-black/5 dark:border-white/5 shrink-0 flex items-start justify-center pt-2">
                    <span className="text-[10px] font-bold text-text-dim">{hour}h00</span>
                  </div>
                  <div className="flex-1 flex">
                    {next7Days.map((_, i) => (
                      <div key={i} className="flex-1 border-r border-black/5 dark:border-white/5 last:border-0"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Colonne d'espacement des heures (invisible mais prend l'espace grid) */}
            <div className="border-r border-black/5 dark:border-white/5 relative z-10"></div>

            {/* Colonnes des jours (avec position absolue des cours) */}
            {next7Days.map((date, idx) => {
              const dateStr = date.toISOString().split('T')[0]
              const dayCourses = coursesByDate[dateStr] || []
              const isToday = idx === 0

              return (
                <div key={idx} className={`relative border-r border-black/5 dark:border-white/5 last:border-0 ${isToday ? 'bg-accent/5' : ''}`}>
                  {dayCourses.map(course => {
                    const startDate = parseDateAsLocal(course.starts_at)
                    const endDate = parseDateAsLocal(course.ends_at)
                    
                    const startHour = startDate.getHours()
                    const startMin = startDate.getMinutes()
                    const endHour = endDate.getHours()
                    const endMin = endDate.getMinutes()

                    const topPx = (startHour - START_HOUR) * HOUR_HEIGHT + (startMin / 60) * HOUR_HEIGHT
                    const durationHours = (endHour - startHour) + (endMin - startMin) / 60
                    const heightPx = durationHours * HOUR_HEIGHT

                    const isReserved = reserved.has(course.id)
                    const isPast = startDate < new Date()
                    const startsStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const endsStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    // Styling conditionnel professionnel
                    let blockStyle = ""
                    
                    if (isPast) {
                      blockStyle = "bg-bg-hover border-border text-text-muted opacity-60"
                    } else if (isReserved) {
                      blockStyle = "bg-accent border-accent text-white shadow-lg shadow-accent/20 ring-1 ring-white/20"
                    } else if (course.is_full) {
                      blockStyle = "bg-danger/20 border-danger/30 text-danger opacity-90"
                    } else {
                      // Des couleurs adaptatives et très lisibles en mode clair et sombre
                      const typeColors = {
                        'Crossfit': 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-500/20',
                        'Yoga': 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-500/20',
                        'Cardio': 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-500/20',
                        'HIIT': 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100/50 dark:hover:bg-orange-500/20',
                        'Pilates': 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 dark:hover:bg-teal-500/20',
                        'Musculation': 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20',
                        'Zumba': 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100/50 dark:hover:bg-pink-500/20'
                      }
                      blockStyle = typeColors[course.type] || "bg-accent/10 dark:bg-accent/20 border-accent/20 dark:border-accent/40 text-accent dark:text-indigo-300 hover:bg-accent/20"
                    }

                    return (
                      <div
                        key={course.id}
                        onClick={() => handleCardClick(course)}
                        className={`absolute left-1 right-1 rounded-xl border p-2 flex flex-col gap-1 transition-all duration-200 overflow-hidden group
                          ${blockStyle}
                          ${!isPast && user?.role === 'adherent' ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer z-20' : 'z-10'}
                        `}
                        style={{ top: `${topPx}px`, height: `${heightPx - 4}px` }}
                      >
                        <div className="flex items-start justify-between">
                          <p className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isReserved ? 'bg-white/20' : 'bg-black/20 text-white/90'}`}>
                            {startsStr}
                          </p>
                          {isReserved && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />}
                        </div>
                        
                        <h4 className={`text-xs font-bold leading-tight line-clamp-2 ${isReserved ? 'text-white' : ''}`}>{course.name}</h4>
                        
                        {heightPx > 60 && (
                          <p className={`text-[9px] font-medium truncate ${isReserved ? 'text-white/80' : 'opacity-80'}`}>{course.coach} · {course.room}</p>
                        )}
                        
                        {!isPast && heightPx > 80 && (
                          <div className="mt-auto flex items-center justify-between">
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${isReserved ? 'text-white/90' : 'opacity-90'}`}>
                              <Users className="w-3 h-3" /> {course.spots_remaining} {t('planning.spotsRemaining') || 'pl.'}
                            </span>
                          </div>
                        )}

                        {/* Overlay Réservation au survol (Uniquement Adhérent - Masqué sur Mobile) */}
                        {user?.role === 'adherent' && !isPast && !isReserved && !course.is_full && (
                          <div className="absolute inset-0 bg-bg-card/80 backdrop-blur-md border border-accent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex items-center justify-center p-2 z-30">
                            <button
                              onClick={(e) => { e.stopPropagation(); reserve(course.id); }}
                              disabled={loading[course.id]}
                              className="w-full py-2 bg-accent text-white rounded-lg text-xs font-bold shadow-accent hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {loading[course.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : t('planning.book') || 'Réserver'}
                            </button>
                          </div>
                        )}

                        {/* Overlay Annulation au survol (Uniquement Adhérent - Masqué sur Mobile) */}
                        {user?.role === 'adherent' && !isPast && isReserved && (
                          <div className="absolute inset-0 bg-bg-card/85 backdrop-blur-md border border-danger rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex items-center justify-center p-2 z-30">
                            <button
                              onClick={(e) => { e.stopPropagation(); cancelReservation(course.id); }}
                              disabled={loading[course.id]}
                              className="w-full py-2 bg-danger text-white rounded-lg text-xs font-bold shadow-danger hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {loading[course.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : (t('planning.cancel') || 'Annuler')}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Confirmation/Details Modal for Adherents (Desktop fallback & Mobile native) */}
      {selectedCourseForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-bg border border-border rounded-3xl shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-bg-hover/30">
              <div>
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-md">
                  {selectedCourseForModal.type}
                </span>
                <h3 className="text-base font-extrabold text-text mt-1.5">{selectedCourseForModal.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedCourseForModal(null)}
                className="text-text-muted hover:text-text font-bold text-sm w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Date & Time */}
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <Calendar className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <p className="font-bold text-text">
                    {(() => {
                      const dt = parseDateAsLocal(selectedCourseForModal.starts_at)
                      return dt.toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                    })()}
                  </p>
                  <p className="text-[10px] mt-0.5">
                    {(() => {
                      const start = parseDateAsLocal(selectedCourseForModal.starts_at)
                      const end = parseDateAsLocal(selectedCourseForModal.ends_at)
                      const formatTime = (d) => d.toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })
                      return `${formatTime(start)} - ${formatTime(end)}`
                    })()}
                  </p>
                </div>
              </div>

              {/* Coach & Room */}
              <div className="grid grid-cols-2 gap-4 bg-bg-hover/20 p-3.5 rounded-2xl border border-border/40">
                <div>
                  <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Coach</p>
                  <p className="text-xs font-bold text-text mt-0.5">{selectedCourseForModal.coach || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Salle</p>
                  <p className="text-xs font-bold text-text mt-0.5">{selectedCourseForModal.room || '—'}</p>
                </div>
              </div>

              {/* Description */}
              {selectedCourseForModal.description && (
                <div className="text-xs text-text-muted leading-relaxed bg-bg-hover/10 p-3 rounded-2xl border border-border/20">
                  <p className="font-bold text-text mb-1">Description</p>
                  <p>{selectedCourseForModal.description}</p>
                </div>
              )}

              {/* Spots remaining */}
              <div className="flex items-center justify-between text-xs font-bold text-text-muted border-t border-border pt-4">
                <span>Places restantes</span>
                <span className="text-text font-extrabold flex items-center gap-1">
                  <Users className="w-4 h-4 text-accent" />
                  {selectedCourseForModal.spots_remaining} / {selectedCourseForModal.max_capacity}
                </span>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-5 border-t border-border bg-bg-hover/10 flex items-center gap-3">
              <button
                onClick={() => setSelectedCourseForModal(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold text-text-muted hover:text-text hover:bg-bg-hover transition-colors cursor-pointer"
              >
                Retour
              </button>
              
              {reserved.has(selectedCourseForModal.id) ? (
                <button
                  onClick={async () => {
                    await cancelReservation(selectedCourseForModal.id)
                    setSelectedCourseForModal(null)
                  }}
                  disabled={loading[selectedCourseForModal.id]}
                  className="flex-[2] py-2.5 bg-danger text-white rounded-xl text-xs font-bold shadow-lg shadow-danger/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading[selectedCourseForModal.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Annuler la réservation
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await reserve(selectedCourseForModal.id)
                    setSelectedCourseForModal(null)
                  }}
                  disabled={loading[selectedCourseForModal.id] || selectedCourseForModal.is_full}
                  className="flex-[2] py-2.5 bg-accent text-white rounded-xl text-xs font-bold shadow-lg shadow-accent/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading[selectedCourseForModal.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {selectedCourseForModal.is_full ? 'Complet' : 'Réserver'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

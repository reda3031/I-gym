import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import {
  Users, BookOpen, TrendingUp, Star, Calendar, Clock, MapPin, Award,
  Plus, Edit2, Trash2, Check, X, ShieldAlert, Sparkles, UserCheck, Flame
} from 'lucide-react'

import { usePolling } from '../../hooks/usePolling'

const SPECIALTIES = ['Musculation', 'Crossfit', 'Cardio', 'Yoga', 'Boxing', 'Fitness', 'HIIT', 'Pilates']
const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function CoachDashboard() {
  const { t, lang } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Timezone-safe local date parser
  const parseDateAsLocal = (str) => {
    if (!str) return new Date()
    const tStr = String(str).replace(' ', 'T')
    const localStr = tStr.split('Z')[0].split('+')[0]
    const d = new Date(localStr)
    return isNaN(d.getTime()) ? new Date(tStr) : d
  }
  
  // Navigation tabs
  const initialTab = searchParams.get('tab') || 'dashboard'
  const [activeTab, setActiveTab] = useState(initialTab) // dashboard | sessions | availabilities | challenges
  
  useEffect(() => {
    const tab = searchParams.get('tab') || 'dashboard'
    setActiveTab(tab)
  }, [searchParams])

  // Data states
  const [dashboardData, setDashboardData] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Status switch
  const [isOnline, setIsOnline] = useState(false)
  
  // Modal states
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancellingCourse, setCancellingCourse] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [viewingParticipantsCourse, setViewingParticipantsCourse] = useState(null)
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false)
  
  // Course form state
  const [courseName, setCourseName] = useState('')
  const [courseType, setCourseType] = useState('Musculation')
  const [courseRoomId, setCourseRoomId] = useState('')
  const [courseDate, setCourseDate] = useState('')
  const [courseStartTime, setCourseStartTime] = useState('10:00')
  const [courseEndTime, setCourseEndTime] = useState('11:00')
  const [courseCapacity, setCourseCapacity] = useState(15)
  const [courseDescription, setCourseDescription] = useState('')
  
  // Availabilities form state
  const [availabilities, setAvailabilities] = useState([])
  
  // Challenge form state
  const [challengeTitle, setChallengeTitle] = useState('')
  const [challengeDesc, setChallengeDesc] = useState('')
  const [challengeDays, setChallengeDays] = useState(30)
  const [challengeXp, setChallengeXp] = useState(100)
  const [challengeBadge, setChallengeBadge] = useState('streak_5')

  // Fetch all coach dashboard details
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/coach/dashboard')
      setDashboardData(res.data)
      setIsOnline(res.data.coach?.online_status === 'online')
      
      // Map availabilities for the form
      const avList = res.data.coach?.availabilities || []
      // Make sure all 7 days exist
      const mappedAvs = WEEKDAYS.map(day => {
        const found = avList.find(a => a.day_of_week === day)
        return found ? { ...found } : {
          day_of_week: day,
          start_time: '08:00:00',
          end_time: '20:00:00',
          is_off: day === 'Dimanche',
          pause_start: '12:00:00',
          pause_end: '14:00:00'
        }
      })
      setAvailabilities(mappedAvs)
    } catch (err) {
      setError('Impossible de récupérer les données du dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch rooms list
  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/rooms')
      setRooms(res.data)
      if (res.data.length > 0) {
        setCourseRoomId(res.data[0].id)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchDashboard()
    fetchRooms()
  }, [fetchDashboard, fetchRooms])

  // Polling every 5 seconds for real-time registrations updates
  usePolling(fetchDashboard, 5000)

  // Toggle online status
  const handleToggleStatus = async () => {
    const nextStatus = isOnline ? 'offline' : 'online'
    try {
      const res = await api.post('/coach/status', { status: nextStatus })
      setIsOnline(res.data.online_status === 'online')
      setSuccess(`Vous êtes désormais ${res.data.online_status === 'online' ? 'visible' : 'invisible'} pour les membres.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Impossible de changer votre statut.')
    }
  }

  // Handle availabilities update
  const handleSaveAvailabilities = async () => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const formatted = availabilities.map(a => ({
        day_of_week: a.day_of_week,
        start_time: a.start_time.includes(':') && a.start_time.split(':').length === 2 ? `${a.start_time}:00` : a.start_time,
        end_time: a.end_time.includes(':') && a.end_time.split(':').length === 2 ? `${a.end_time}:00` : a.end_time,
        is_off: !!a.is_off,
        pause_start: a.pause_start ? (a.pause_start.includes(':') && a.pause_start.split(':').length === 2 ? `${a.pause_start}:00` : a.pause_start) : null,
        pause_end: a.pause_end ? (a.pause_end.includes(':') && a.pause_end.split(':').length === 2 ? `${a.pause_end}:00` : a.pause_end) : null,
      }))
      
      const res = await api.put('/coach/availabilities', { availabilities: formatted })
      setSuccess('Vos disponibilités hebdomadaires ont été enregistrées avec succès.')
      setDashboardData(prev => ({
        ...prev,
        coach: { ...prev.coach, availabilities: res.data.availabilities }
      }))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour des disponibilités.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAvailabilityChange = (index, field, value) => {
    const updated = [...availabilities]
    updated[index][field] = value
    setAvailabilities(updated)
  }

  // Course management: Create / Edit modals
  const handleOpenCreateCourse = () => {
    setEditingCourse(null)
    setCourseName('')
    setCourseType('Musculation')
    if (rooms.length > 0) setCourseRoomId(rooms[0].id)
    setCourseDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]) // tomorrow
    setCourseStartTime('09:00')
    setCourseEndTime('10:00')
    setCourseCapacity(15)
    setCourseDescription('')
    setIsCourseModalOpen(true)
  }

  const handleOpenEditCourse = (course) => {
    setEditingCourse(course)
    setCourseName(course.name)
    setCourseType(course.type)
    setCourseRoomId(course.room_id || rooms[0]?.id)
    
    let courseDateStr = ''
    let startTimeStr = '08:00'
    let endTimeStr = '09:00'
    
    if (course.starts_at) {
      const parsedStart = String(course.starts_at)
      const dateMatch = parsedStart.match(/^(\d{4}-\d{2}-\d{2})/)
      const timeMatch = parsedStart.match(/[T ](\d{2}:\d{2})/)
      if (dateMatch) courseDateStr = dateMatch[1]
      if (timeMatch) startTimeStr = timeMatch[1]
    }
    
    if (course.ends_at) {
      const parsedEnd = String(course.ends_at)
      const timeMatch = parsedEnd.match(/[T ](\d{2}:\d{2})/)
      if (timeMatch) endTimeStr = timeMatch[1]
    }
    
    setCourseDate(courseDateStr)
    setCourseStartTime(startTimeStr)
    setCourseEndTime(endTimeStr)
    setCourseCapacity(course.max_capacity)
    setCourseDescription(course.description || '')
    setIsCourseModalOpen(true)
  }

  const handleSubmitCourse = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setActionLoading(true)

    const starts_at = `${courseDate} ${courseStartTime}:00`
    const ends_at = `${courseDate} ${courseEndTime}:00`

    const payload = {
      name: courseName,
      type: courseType,
      room_id: courseRoomId,
      starts_at,
      ends_at,
      max_capacity: parseInt(courseCapacity),
      description: courseDescription
    }

    try {
      if (editingCourse) {
        await api.put(`/coach/courses/${editingCourse.id}`, payload)
        setSuccess('Séance mise à jour avec succès.')
      } else {
        await api.post('/coach/courses', payload)
        setSuccess('Nouveau cours planifié avec succès. Les membres de la gym en ont été notifiés !')
      }
      setIsCourseModalOpen(false)
      fetchDashboard()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde de la séance.')
    } finally {
      setActionLoading(false)
    }
  }

  // Cancel Course
  const handleOpenCancelCourse = (course) => {
    setCancellingCourse(course)
    setCancelReason('')
    setIsCancelModalOpen(true)
  }

  const handleCancelCourseSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setActionLoading(true)

    try {
      await api.post(`/coach/courses/${cancellingCourse.id}/cancel`, { reason: cancelReason })
      setSuccess('La séance a été annulée. Les membres inscrits et l\'administration ont été alertés.')
      setIsCancelModalOpen(false)
      fetchDashboard()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible d\'annuler cette séance.')
    } finally {
      setActionLoading(false)
    }
  }

  // Create Challenge
  const handleCreateChallenge = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setActionLoading(true)

    const payload = {
      title: challengeTitle,
      description: challengeDesc,
      duration_days: parseInt(challengeDays),
      xp_reward: parseInt(challengeXp),
      badge_reward: challengeBadge
    }

    try {
      await api.post('/coach/challenges', payload)
      setSuccess('Nouveau challenge fitness lancé ! Tous les adhérents peuvent s\'y inscrire.')
      setIsChallengeModalOpen(false)
      fetchDashboard()
      // reset challenge inputs
      setChallengeTitle('')
      setChallengeDesc('')
      setChallengeDays(30)
      setChallengeXp(100)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du lancement du challenge.')
    } finally {
      setActionLoading(false)
    }
  }

  const getDayLabel = (dayIndex) => {
    const keys = ['day.lun', 'day.mar', 'day.mer', 'day.jeu', 'day.ven', 'day.sam', 'day.dim']
    return keys[dayIndex - 1] ? t(keys[dayIndex - 1]) : dayIndex
  }

  const getDayTranslationKey = (dayName) => {
    const mapping = {
      'Lundi': 'day.lun',
      'Mardi': 'day.mar',
      'Mercredi': 'day.mer',
      'Jeudi': 'day.jeu',
      'Vendredi': 'day.ven',
      'Samedi': 'day.sam',
      'Dimanche': 'day.dim'
    }
    return mapping[dayName] || dayName
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { coach, kpis, courses = [], reviews = [], challenges = [], heatmap = {} } = dashboardData || {}

  return (
    <div className="space-y-6 max-w-6xl mx-auto">


      {/* Error & Success Messages */}
      {error && (
        <div className="p-4 bg-danger-muted/20 border border-danger/40 text-danger rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <X className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-success-muted/20 border border-success/40 text-success rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}



      {/* ── TAB: DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Header and Online Switch */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-text tracking-tight">{t('dashboard.coach.title')}</h1>
              <p className="text-text-muted text-sm mt-0.5">
                {t('coach.welcomeBack')} <span className="font-bold text-text">Coach {user?.name}</span>. {t('coach.welcomeBackSub')}
              </p>
            </div>


          </div>

          {/* KPIs grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, label: t('coach.kpis.coursesToday'), value: kpis?.courses_today ?? 0, color: 'text-accent', key: 'coursesToday' },
              { icon: Users, label: t('coach.kpis.confirmedRegistered'), value: kpis?.total_participants ?? 0, color: 'text-info', key: 'confirmedRegistered' },
              { icon: TrendingUp, label: t('coach.kpis.fillRate'), value: `${kpis?.fill_rate ?? 0}%`, color: 'text-warning', key: 'fillRate' },
              { icon: Star, label: t('coach.kpis.satisfaction'), value: `${coach?.satisfaction_score ?? 5.0} ⭐`, color: 'text-level-gold', key: 'satisfaction' }
            ].map(({ icon: Icon, label, value, color, key }) => (
              <div key={key} className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-bg-hover group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted font-semibold tracking-wide uppercase">{label}</p>
                    <p className="text-2xl font-black text-text mt-0.5">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Heatmap Section */}
            <div className="glass-card rounded-2xl border border-border p-5 lg:col-span-2">
              <h3 className="text-md font-extrabold text-text mb-1 flex items-center gap-2">
                <Flame className="w-5 h-5 text-accent" /> {t('coach.heatmap.title')}
              </h3>
              <p className="text-xs text-text-muted mb-4">{t('coach.heatmap.subtitle')}</p>
              
              <div className="space-y-2">
                {/* Visual grid header */}
                <div className="flex text-[10px] text-text-muted font-bold pl-8">
                  {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                    <div key={h} className="flex-1 text-center">{h}h</div>
                  ))}
                </div>

                {/* Grid content */}
                {[1, 2, 3, 4, 5, 6].map(dayNum => {
                  const daySlots = heatmap[dayNum] || array_fill(6, 17, 0)
                  return (
                    <div key={dayNum} className="flex items-center text-xs">
                      <span className="w-8 font-bold text-text-muted text-[11px] uppercase">{getDayLabel(dayNum)}</span>
                      <div className="flex flex-1 gap-1.5 ml-2">
                        {Array.from({ length: 15 }, (_, i) => i + 7).map(h => {
                          const val = daySlots[h] || 0
                          const colorClass = val > 15 ? 'bg-accent' : val > 8 ? 'bg-accent/60' : val > 0 ? 'bg-accent/20' : 'bg-bg-hover'
                          return (
                            <div
                              key={h}
                              className={`flex-1 h-5 rounded-md transition-all ${colorClass}`}
                              title={`${getDayLabel(dayNum)} ${t('common.at')} ${h}h : ${val} ${t('coach.sessions.registeredCount')}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="glass-card rounded-2xl border border-border p-5">
              <h3 className="text-md font-extrabold text-text mb-4 flex items-center gap-2">
                <Star className="w-4.5 h-4.5 text-warning fill-warning" /> {t('coach.reviews.title')}
              </h3>
              {reviews.length === 0 ? (
                <p className="text-text-muted text-xs text-center py-10">Aucun avis laissé pour le moment.</p>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {reviews.map(r => (
                    <div key={r.id} className="p-3 bg-bg-hover/50 border border-border/40 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={r.user_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                          <span className="text-xs font-bold text-text">{r.user_name}</span>
                        </div>
                        <div className="flex items-center text-warning font-bold text-xs gap-0.5">
                          <Star className="w-3 h-3 fill-warning" /> {r.rating}
                        </div>
                      </div>
                      <p className="text-xs text-text-muted italic">"{r.comment}"</p>
                      <p className="text-[9px] text-text-muted text-right">{r.created_at}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SESSIONS ── */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-text tracking-tight">{t('coach.sessions.title')}</h1>
              <p className="text-text-muted text-sm mt-0.5">{t('coach.sessions.subtitle')}</p>
            </div>
            <button
              onClick={handleOpenCreateCourse}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2 px-4 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" /> {t('coach.sessions.planBtn')}
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 border border-border text-center">
              <Calendar className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-text-muted text-sm mb-4">{t('coach.sessions.noSessions')}</p>
              <button onClick={handleOpenCreateCourse} className="text-accent text-xs font-bold hover:underline">
                {t('coach.sessions.createFirst')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map(c => {
                const isCancelled = c.status === 'cancelled'
                const start = parseDateAsLocal(c.starts_at)
                const end = parseDateAsLocal(c.ends_at)
                return (
                  <div
                    key={c.id}
                    className={`glass-card rounded-xl p-4 border transition-all ${
                      isCancelled ? 'border-danger/30 bg-danger-muted/5 opacity-70' : 'border-border bg-bg hover:border-border-hover'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold text-sm ${isCancelled ? 'line-through text-text-muted' : 'text-text'}`}>
                            {c.name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCancelled ? 'bg-danger/10 text-danger' : 'bg-accent/15 text-accent'
                          }`}>
                            {c.type}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {start.toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR')} {t('common.from')} {start.toLocaleTimeString(lang === 'ar' ? 'ar-MA' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {hour: '2-digit', minute:'2-digit'})} {t('common.at')} {end.toLocaleTimeString(lang === 'ar' ? 'ar-MA' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {c.room_name || t('course.mainRoom') || 'Salle Principale'}
                          </span>
                        </div>

                        {isCancelled && (
                          <p className="text-xs text-danger font-medium flex items-center gap-1 mt-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> {t('coach.sessions.cancelled')} {c.cancellation_reason}
                          </p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3">
                        {/* Participants stats */}
                        <div className="text-right shrink-0">
                          <button
                            onClick={() => setViewingParticipantsCourse(c)}
                            className="text-xs font-bold text-accent hover:underline flex items-center gap-1.5"
                          >
                            <Users className="w-3.5 h-3.5" /> {c.current_reservations} / {c.max_capacity} {t('coach.sessions.registeredCount')}
                          </button>
                        </div>

                        {!isCancelled && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditCourse(c)}
                              className="p-2 hover:bg-bg-hover border border-border rounded-lg text-text-muted hover:text-text transition-all"
                              title={t('common.edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenCancelCourse(c)}
                              className="p-2 hover:bg-danger/10 border border-danger/10 text-danger/80 hover:text-danger rounded-lg transition-all"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: AVAILABILITIES ── */}
      {activeTab === 'availabilities' && (
        <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-text tracking-tight">{t('coach.availabilities.title')}</h1>
            <p className="text-text-muted text-sm mt-0.5">{t('coach.availabilities.subtitle')}</p>
          </div>

          <div className="space-y-4">
            {availabilities.map((av, idx) => (
              <div key={av.day_of_week} className="grid grid-cols-1 md:grid-cols-6 items-center gap-4 bg-bg-hover/30 p-4 rounded-xl border border-border/50">
                {/* Day Label */}
                <div className="font-bold text-text text-sm md:col-span-1">{t(getDayTranslationKey(av.day_of_week))}</div>

                {/* Rest Day switch */}
                <div className="md:col-span-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={!!av.is_off}
                      onChange={(e) => handleAvailabilityChange(idx, 'is_off', e.target.checked)}
                      className="checkbox-modern"
                    />
                    {t('coach.availabilities.off')}
                  </label>
                </div>

                {!av.is_off ? (
                  <>
                    {/* Working Hours */}
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span className="text-xs text-text-muted shrink-0">{t('coach.availabilities.hours')}</span>
                      <input
                        type="time"
                        value={av.start_time.substring(0, 5)}
                        onChange={(e) => handleAvailabilityChange(idx, 'start_time', e.target.value)}
                        className="bg-bg border border-border rounded-lg text-xs p-1.5 text-text focus:outline-none focus:border-accent"
                      />
                      <span className="text-xs text-text-muted">-</span>
                      <input
                        type="time"
                        value={av.end_time.substring(0, 5)}
                        onChange={(e) => handleAvailabilityChange(idx, 'end_time', e.target.value)}
                        className="bg-bg border border-border rounded-lg text-xs p-1.5 text-text focus:outline-none focus:border-accent"
                      />
                    </div>

                    {/* Pause break hours */}
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span className="text-xs text-text-muted shrink-0">{t('coach.availabilities.pause')}</span>
                      <input
                        type="time"
                        value={av.pause_start ? av.pause_start.substring(0, 5) : ''}
                        onChange={(e) => handleAvailabilityChange(idx, 'pause_start', e.target.value || null)}
                        placeholder={t('common.from').toLowerCase()}
                        className="bg-bg border border-border rounded-lg text-xs p-1.5 text-text focus:outline-none focus:border-accent"
                      />
                      <span className="text-xs text-text-muted">-</span>
                      <input
                        type="time"
                        value={av.pause_end ? av.pause_end.substring(0, 5) : ''}
                        onChange={(e) => handleAvailabilityChange(idx, 'pause_end', e.target.value || null)}
                        placeholder={t('common.at').toLowerCase()}
                        className="bg-bg border border-border rounded-lg text-xs p-1.5 text-text focus:outline-none focus:border-accent"
                      />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-4 text-xs text-text-muted font-medium italic">{t('coach.availabilities.noBookings')}</div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveAvailabilities}
              disabled={actionLoading}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2 px-6 rounded-xl transition-all shadow-md shadow-accent-muted/10"
            >
              {actionLoading ? t('coach.availabilities.saving') : t('coach.availabilities.saveBtn')}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: CHALLENGES ── */}
      {activeTab === 'challenges' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-text tracking-tight">{t('coach.tabs.challenges')}</h1>
              <p className="text-text-muted text-sm mt-0.5">{t('coach.modal.challengeDescLabel').replace('*','').trim()}</p>
            </div>
            <button
              onClick={() => setIsChallengeModalOpen(true)}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2 px-4 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" /> {t('coach.modal.challengeCreateTitle')}
            </button>
          </div>

          {challenges.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 border border-border text-center">
              <Award className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-text-muted text-sm">{t('coach.modal.noParticipants')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {challenges.map(ch => (
                <div key={ch.id} className="glass-card rounded-2xl border border-border p-5 hover-card relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success px-2 py-0.5 rounded-full">
                      {ch.status}
                    </span>
                    <h3 className="font-bold text-text text-base leading-tight flex items-center gap-1.5">
                      🏆 {ch.title}
                    </h3>
                    <p className="text-xs text-text-muted mt-2">{ch.description}</p>

                    <div className="flex items-center gap-4 mt-4 bg-bg-hover/40 p-2.5 rounded-xl border border-border/40 text-xs">
                      <div>
                        {t('coach.modal.challengeDuration')} <span className="font-bold text-text">{ch.duration_days} {t('coach.modal.challengeDays')}</span>
                      </div>
                      <div className="border-l border-border pl-4">
                        XP : <span className="font-bold text-accent">+{ch.xp_reward} XP</span>
                      </div>
                        <div className="border-l border-border pl-4">
                        Badge : <span className="font-bold text-warning">{ch.badge_reward}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-text-muted flex items-center gap-1">
                      <Users className="w-4 h-4" /> {ch.participants_count || 0} {t('coach.modal.challengeActiveParticipants')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
            {/* ── MODAL: CREATE / EDIT SESSIONS ── */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-bg border border-border w-[95%] sm:w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-border bg-bg-hover">
              <h2 className="text-lg font-bold text-text flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" /> {editingCourse ? t('coach.modal.editTitle') : t('coach.modal.createTitle')}
              </h2>
              <button onClick={() => setIsCourseModalOpen(false)} className="p-1 rounded-lg text-text-muted hover:bg-border transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCourse} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.nameLabel')}</label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder={t('coach.modal.namePlaceholder')}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.typeLabel')}</label>
                  <select
                    value={courseType}
                    onChange={(e) => setCourseType(e.target.value)}
                    className="select-modern"
                  >
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.roomLabel')}</label>
                  <select
                    value={courseRoomId}
                    onChange={(e) => setCourseRoomId(e.target.value)}
                    className="select-modern"
                  >
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({t('coach.modal.capacityLabel').replace('*','').trim()}: {r.max_capacity})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1.5">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.dateLabel')}</label>
                  <input
                    type="date"
                    required
                    value={courseDate}
                    onChange={(e) => setCourseDate(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-text focus:outline-none focus:border-accent text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.startLabel')}</label>
                  <input
                    type="time"
                    required
                    value={courseStartTime}
                    onChange={(e) => setCourseStartTime(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-text focus:outline-none focus:border-accent text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.endLabel')}</label>
                  <input
                    type="time"
                    required
                    value={courseEndTime}
                    onChange={(e) => setCourseEndTime(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-text focus:outline-none focus:border-accent text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.capacityLabel')}</label>
                  <input
                    type="number"
                    required
                    min="5"
                    max="100"
                    value={courseCapacity}
                    onChange={(e) => setCourseCapacity(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.descLabel')}</label>
                <textarea
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder={t('coach.modal.descPlaceholder')}
                  rows="2"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-text focus:outline-none focus:border-accent text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="flex-1 bg-bg-hover hover:bg-border text-text py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  {actionLoading ? t('coach.modal.saving') : editingCourse ? t('coach.modal.updateBtn') : t('coach.modal.createBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CANCEL COURSE (4 hours limit validation) ── */}
      {isCancelModalOpen && cancellingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-bg border border-border w-[95%] sm:w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-5 border-b border-border bg-bg-hover">
              <h2 className="text-lg font-bold text-text flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-danger" /> {t('coach.modal.cancelTitle')}
              </h2>
            </div>

            <form onSubmit={handleCancelCourseSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-text-muted leading-relaxed">
                {t('coach.modal.cancelNotice')} <span className="font-bold text-text">"{cancellingCourse.name}"</span>{' '}
                {t('common.at').toLowerCase()}{' '}
                {(() => {
                  if (!cancellingCourse?.starts_at) return ''
                  const dt = parseDateAsLocal(cancellingCourse.starts_at)
                  if (isNaN(dt.getTime())) return cancellingCourse.starts_at
                  return dt.toLocaleString(lang === 'ar' ? 'ar-MA' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR')
                })()}.
              </p>
              
              {/* Check 4 hours rule on frontend also */}
              {(() => {
                if (!cancellingCourse?.starts_at) return null
                const startsAt = parseDateAsLocal(cancellingCourse.starts_at)
                if (isNaN(startsAt.getTime())) return null
                const now = new Date()
                const diffHours = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)
                
                if (diffHours < 4) {
                  return (
                    <div className="p-3.5 bg-danger-muted/15 border border-danger/30 text-danger rounded-xl text-xs space-y-2">
                      <p className="font-bold flex items-center gap-1">
                        ⚠️ {t('coach.modal.cancelBlockedTitle')}
                      </p>
                      <p>
                        {t('coach.modal.cancelBlockedNotice')}{' '}
                        <span className="font-bold">{Math.max(0, Math.floor(diffHours))}h {Math.round((diffHours % 1) * 60)}min</span>.
                      </p>
                    </div>
                  )
                }

                return (
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">{t('coach.modal.cancelReasonLabel')}</label>
                    <input
                      type="text"
                      required
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder={t('coach.modal.cancelReasonPlaceholder')}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                    />
                    <p className="text-[10px] text-text-muted mt-1.5">
                      {t('coach.modal.cancelNotificationNotice')}
                    </p>
                  </div>
                )
              })()}

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 bg-bg-hover hover:bg-border text-text py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  {t('common.close')}
                </button>
                {(() => {
                  if (!cancellingCourse?.starts_at) return null
                  const startsAt = parseDateAsLocal(cancellingCourse.starts_at)
                  if (isNaN(startsAt.getTime())) return null
                  const now = new Date()
                  const diffHours = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)
                  
                  if (diffHours >= 4) {
                    return (
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="flex-1 bg-danger hover:bg-danger/90 text-white py-2 rounded-xl text-sm font-semibold transition-all"
                      >
                        {actionLoading ? t('coach.modal.cancelling') : t('coach.modal.confirmCancelBtn')}
                      </button>
                    )
                  }
                  return null
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW REGISTERED PARTICIPANTS ── */}
      {viewingParticipantsCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-bg border border-border w-[95%] sm:w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-border bg-bg-hover">
              <h2 className="text-lg font-bold text-text flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-accent" /> {t('coach.modal.participantsTitle')}
              </h2>
              <button
                onClick={() => setViewingParticipantsCourse(null)}
                className="p-1 rounded-lg text-text-muted hover:bg-border transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-text-muted">
                {t('coach.modal.participantsSubtitle')} <span className="font-bold text-text">"{viewingParticipantsCourse.name}"</span> :
              </p>

              {viewingParticipantsCourse.participants?.length === 0 ? (
                <p className="text-xs text-text-muted italic text-center py-6">{t('coach.modal.noParticipants')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {viewingParticipantsCourse.participants?.map((p, idx) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-text">{p.name}</p>
                        <p className="text-[10px] text-text-muted">{p.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold text-[10px]">
                        {t('coach.modal.confirmedStatus')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-bg-hover flex justify-end">
              <button
                onClick={() => setViewingParticipantsCourse(null)}
                className="bg-accent text-white text-xs font-bold py-2 px-4 rounded-xl"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE FITNESS CHALLENGE ── */}
      {isChallengeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-bg border border-border w-[95%] sm:w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-border bg-bg-hover">
              <h2 className="text-lg font-bold text-text flex items-center gap-1.5">
                <Award className="w-5 h-5 text-accent" /> {t('coach.modal.challengeCreateTitle')}
              </h2>
              <button onClick={() => setIsChallengeModalOpen(false)} className="p-1 rounded-lg text-text-muted hover:bg-border transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.challengeTitleLabel')}</label>
                <input
                  type="text"
                  required
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder={t('coach.modal.challengeTitlePlaceholder')}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.challengeDescLabel')}</label>
                <textarea
                  required
                  value={challengeDesc}
                  onChange={(e) => setChallengeDesc(e.target.value)}
                  placeholder={t('coach.modal.challengeDescPlaceholder')}
                  rows="3"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-text focus:outline-none focus:border-accent text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.challengeDurationLabel')}</label>
                  <input
                    type="number"
                    required
                    min="7"
                    max="180"
                    value={challengeDays}
                    onChange={(e) => setChallengeDays(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.challengeXpLabel')}</label>
                  <input
                    type="number"
                    required
                    min="50"
                    max="1000"
                    value={challengeXp}
                    onChange={(e) => setChallengeXp(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t('coach.modal.challengeBadgeLabel')}</label>
                <select
                  value={challengeBadge}
                  onChange={(e) => setChallengeBadge(e.target.value)}
                  className="select-modern"
                >
                  <option value="first_session">🔥 {t('badge.firstSession')}</option>
                  <option value="streak_5">⚡ {t('badge.streak5')}</option>
                  <option value="streak_10">👑 {t('badge.streak10')}</option>
                  <option value="gold_member">🏆 {t('badge.goldMember')}</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsChallengeModalOpen(false)}
                  className="flex-1 bg-bg-hover hover:bg-border text-text py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  {actionLoading ? t('coach.modal.challengeLaunching') : t('coach.modal.challengeLaunchBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function array_fill(start, count, val) {
  const arr = {}
  for (let i = start; i < start + count; i++) {
    arr[i] = val
  }
  return arr
}

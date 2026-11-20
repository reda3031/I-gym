import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { usePolling } from '../../hooks/usePolling'
import StreakCard from '../../components/gamification/StreakCard'
import {
  Calendar, Target, Zap, FileText, Loader2, Star, Check, Award,
  Users, MapPin, Clock, Heart, BookOpen, Smile, User, Send, Flame, AlertCircle,
  TrendingUp, Activity, Bell, History, ArrowRight, X
} from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useSearchParams } from 'react-router-dom'

export default function AdherentDashboard() {
  const { t, lang } = useTranslation()
  const { user, refreshUser } = useAuth()
  
  // Tab states controlled via URL query params
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSubTab = searchParams.get('tab') || 'overview'

  const setActiveSubTab = (tabId) => {
    setSearchParams({ tab: tabId })
  }

  // Data states
  const [achievements, setAchievements] = useState(null)
  const [weekSummary, setWeekSummary] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [coaches, setCoaches] = useState([])
  const [challenges, setChallenges] = useState([])
  const [pdfLoading, setPdfLoading] = useState(false)
  const [objective, setObjective] = useState(user?.objective_type || '')
  
  // Real-time states
  const [reservations, setReservations] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const parseDateAsLocal = (str) => {
    if (!str) return new Date()
    const tStr = String(str).replace(' ', 'T')
    const localStr = tStr.split('Z')[0].split('+')[0]
    const d = new Date(localStr)
    return isNaN(d.getTime()) ? new Date(tStr) : d
  }

  const getCountdown = (targetDateStr) => {
    if (!targetDateStr) return null
    const target = parseDateAsLocal(targetDateStr)
    const diff = target - currentTime
    if (diff <= 0) return "En cours..."
    
    const h = Math.floor(diff / (1000 * 60 * 60))
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const s = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  
  // Review & Coach Details Modal States
  const [selectedCoachDetails, setSelectedCoachDetails] = useState(null)
  const [submittingReview, setSubmittingReview] = useState(false)
  
  // Streak Leaderboard States
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false)
  const [streakLeaderboard, setStreakLeaderboard] = useState([])
  const [streakLoading, setStreakLoading] = useState(false)

  const handleOpenStreakLeaderboard = async () => {
    setIsStreakModalOpen(true)
    setStreakLoading(true)
    try {
      const { data } = await api.get('/leaderboard/streak')
      setStreakLeaderboard(data.leaderboard || [])
    } catch (e) {
      console.error("Failed to load streak leaderboard", e)
    } finally {
      setStreakLoading(false)
    }
  }
  const [ratingInput, setRatingInput] = useState(5)
  const [commentInput, setCommentInput] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  
  // Feedback
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchOverview = useCallback(async () => {
    if (!user?.id) return
    try {
      const [achRes, weekRes, resRes] = await Promise.all([
        api.get(`/users/${user.id}/achievements`),
        api.get(`/attendance/weekly-summary/${user.id}`),
        api.get('/reservations/mine').catch(() => ({ data: [] }))
      ])
      setAchievements(achRes.data)
      setWeekSummary(weekRes.data)
      setReservations(resRes.data)
    } catch {}
  }, [user?.id])

  const fetchCoachesAndChallenges = useCallback(async () => {
    try {
      const [coachesRes, challengesRes] = await Promise.all([
        api.get('/members/coaches'),
        api.get('/members/challenges')
      ])
      setCoaches(coachesRes.data)
      setChallenges(challengesRes.data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchOverview()
    fetchCoachesAndChallenges()
  }, [fetchOverview, fetchCoachesAndChallenges])

  usePolling(fetchOverview, 5000)
  usePolling(fetchCoachesAndChallenges, 5000)

  // Recommandations selon objectif
  const loadRecommendations = async (obj) => {
    if (!obj) return
    try {
      const { data } = await api.post('/recommendations', { objective_type: obj })
      setRecommendations(data)
      await refreshUser()
    } catch {}
  }

  // Générer PDF
  const generatePdf = async () => {
    setPdfLoading(true)
    try {
      const { data } = await api.get(`/training/generate-pdf/${user.id}`)
      window.open(data.download_url, '_blank')
    } catch {
      alert('Erreur lors de la génération du PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  // Open coach details & reviews modal
  const handleOpenCoachDetails = async (coachId) => {
    try {
      const res = await api.get(`/members/coaches/${coachId}`)
      setSelectedCoachDetails(res.data)
      setRatingInput(5)
      setCommentInput('')
      setReviewSuccess('')
    } catch {
      alert('Impossible de charger le profil détaillé du coach.')
    }
  }

  // Submit coach review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!selectedCoachDetails) return
    setSubmittingReview(true)
    setReviewSuccess('')

    try {
      const res = await api.post(`/members/coaches/${selectedCoachDetails.id}/reviews`, {
        rating: ratingInput,
        comment: commentInput
      })
      setReviewSuccess(res.data.message)
      
      // Update details online average score dynamically
      setSelectedCoachDetails(prev => ({
        ...prev,
        satisfaction_score: res.data.satisfaction_score
      }))

      // Refresh coaches listing
      fetchCoachesAndChallenges()
      setCommentInput('')
    } catch {
      alert('Erreur lors de la soumission de l\'évaluation.')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Join fitness challenge
  const handleJoinChallenge = async (challengeId) => {
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await api.post(`/members/challenges/${challengeId}/join`)
      setSuccessMsg(res.data.message)
      fetchCoachesAndChallenges()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch {
      setErrorMsg('Impossible de rejoindre ce challenge.')
    }
  }

  const objectiveLabels = {
    perte_de_poids: t('objective.perte_de_poids'),
    prise_de_masse: t('objective.prise_de_masse'),
    endurance:      t('objective.endurance'),
    flexibilite:    t('objective.flexibilite'),
  }

  // Dynamic header details based on the selected tab
  const getHeaderDetails = () => {
    switch (activeSubTab) {
      case 'coaches':
        return {
          title: t('nav.adherentCoaches') || "Nos Coachs & Experts",
          subtitle: t('dashboard.adherent.coachesSubtitle') || "Découvrez notre équipe de professionnels pour vous accompagner.",
          showPdfBtn: false
        }
      case 'challenges':
        return {
          title: t('nav.challenges') || "Challenges I-Gym",
          subtitle: t('dashboard.adherent.challengesSubtitle') || "Relevez des défis, gagnez des points et débloquez des badges !",
          showPdfBtn: false
        }
      case 'subscription':
        return {
          title: t('nav.mySubscription') || "Mon Abonnement",
          subtitle: t('dashboard.adherent.subscriptionSubtitle') || "Gérez votre formule d'abonnement, vos paiements et vos avantages.",
          showPdfBtn: false
        }
      case 'overview':
      default:
        return {
          title: t('dashboard.adherent.title') || "Mon Dashboard",
          subtitle: (
            <>
              {user?.level && (
                <span className="capitalize font-bold text-accent">{t('dashboard.adherent.level')} {user.level} · </span>
              )}
              {t('dashboard.adherent.welcome')}, {user?.name?.split(' ')[0]} !
            </>
          ),
          showPdfBtn: true
        }
    }
  }

  const header = getHeaderDetails()

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">{header.title}</h1>
          <p className="text-text-muted text-sm mt-0.5">{header.subtitle}</p>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 bg-success-muted/20 border border-success/40 text-success rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-danger-muted/20 border border-danger/40 text-danger rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <X className="w-4 h-4 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* ── TAB: OVERVIEW ── */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Welcome Section */}
            <div className="glass-card rounded-2xl p-6 border border-border relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-text mb-1">
                  {t('dashboard.adherent.welcome')}, <span className="text-accent">{user?.name?.split(' ')[0]}</span> ! 👋
                </h2>
                <p className="text-sm text-text-muted italic mb-4">
                  "{weekSummary?.message || 'Prêt à repousser vos limites aujourd\'hui ?'}"
                </p>
                <div className="flex items-center gap-3 text-xs font-bold bg-bg-hover/50 p-3 rounded-xl border border-border/50">
                  <Target className="w-4 h-4 text-warning" />
                  <span>Objectif : <span className="text-text uppercase tracking-wider">{objectiveLabels[objective] || objective}</span></span>
                </div>
              </div>
            </div>

            {/* 2. Countdown Prochaine Séance */}
            {weekSummary?.next_reservation && (
              <div className="bg-gradient-to-br from-accent/20 to-accent-hover/10 rounded-2xl p-5 border border-accent/30 flex items-center justify-between shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-accent/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Prochaine séance
                  </h3>
                  <p className="text-lg font-black text-text">{weekSummary.next_reservation.course_name}</p>
                </div>
                <div className="relative z-10 text-right bg-bg/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-accent/20">
                  <p className="text-[10px] text-text-muted font-bold uppercase mb-0.5">Commence dans</p>
                  <p className="text-xl font-mono font-black text-accent">
                    {getCountdown(weekSummary.next_reservation.starts_at)}
                  </p>
                </div>
              </div>
            )}

            {/* 4. Gamification (StreakCard) */}
            {achievements && (
              <StreakCard achievements={achievements} />
            )}

            {/* Body Metrics */}
            <div className="glass-card rounded-2xl p-5 border border-border mt-6">
              <h3 className="text-sm font-extrabold text-text mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-accent" /> Évolution Corporelle
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                      <TrendingUp className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Poids Actuel</p>
                      <p className="text-sm font-black text-text mt-0.5">76.5 <span className="text-[10px] text-text-muted font-bold">kg</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-success font-bold bg-success/10 px-2 py-1 rounded-lg">-1.2 kg</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center">
                      <Zap className="w-4.5 h-4.5 text-warning" />
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Masse Musculaire</p>
                      <p className="text-sm font-black text-text mt-0.5">42.1 <span className="text-[10px] text-text-muted font-bold">%</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-success font-bold bg-success/10 px-2 py-1 rounded-lg">+0.8 %</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 3. Statistiques Utilisateur (Mini Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card p-4 rounded-2xl border border-border text-center hover-card">
                <Activity className="w-5 h-5 text-accent mx-auto mb-2" />
                <p className="text-2xl font-black text-text">{achievements?.total_sessions || 0}</p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Séances</p>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-border text-center hover-card">
                <Flame className="w-5 h-5 text-warning mx-auto mb-2" />
                <p className="text-2xl font-black text-text">{(achievements?.total_sessions || 0) * 320}</p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Kcal Brûlées</p>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-border text-center hover-card">
                <Clock className="w-5 h-5 text-success mx-auto mb-2" />
                <p className="text-2xl font-black text-text">{(achievements?.total_sessions || 0) * 1.5}h</p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Temps</p>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-border text-center hover-card">
                <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-text">{weekSummary?.progress_percentage || 0}%</p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Progression</p>
              </div>
            </div>

            {/* Weekly Activity Chart (CSS-based) */}
            <div className="glass-card rounded-2xl p-5 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-text flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Activity className="w-4.5 h-4.5 text-accent" /> Activité de la Semaine
                </h3>
                <span className="text-[10px] font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-lg">
                  Objectif: 4 séances
                </span>
              </div>
              
              <div className="flex items-end justify-between h-32 gap-2 mt-2 px-1">
                {[
                  { day: 'Lun', val: 40, active: false },
                  { day: 'Mar', val: 80, active: true },
                  { day: 'Mer', val: 0, active: false },
                  { day: 'Jeu', val: 60, active: true },
                  { day: 'Ven', val: 100, active: true },
                  { day: 'Sam', val: 0, active: false },
                  { day: 'Dim', val: 0, active: false }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="relative w-full flex justify-center h-24">
                      {/* Bar Background */}
                      <div className="absolute bottom-0 w-full max-w-[32px] h-full bg-bg-hover rounded-t-lg transition-colors group-hover:bg-bg-hover/80 border border-border/40" />
                      {/* Bar Fill */}
                      <div 
                        className={`absolute bottom-0 w-full max-w-[32px] rounded-t-lg transition-all duration-700 ease-out flex items-start justify-center pt-2 ${item.active ? 'bg-gradient-to-t from-accent to-accent-hover shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]' : 'bg-border/30'}`} 
                        style={{ height: `${item.val}%` }} 
                      >
                         {item.active && <div className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-sm" />}
                      </div>
                      {/* Tooltip on hover */}
                      {item.val > 0 && (
                        <div className="absolute -top-7 bg-text text-bg text-[9px] font-black px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {item.val}%
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${item.active ? 'text-text' : 'text-text-muted'}`}>
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 5. Challenges Actifs Summary */}
              <div className="glass-card rounded-2xl p-5 border border-border">
                <h3 className="font-extrabold text-text mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Award className="w-4.5 h-4.5 text-accent" /> Challenges Actifs
                </h3>
                {challenges.filter(c => c.is_joined).length === 0 ? (
                  <p className="text-xs text-text-muted italic">Aucun challenge en cours.</p>
                ) : (
                  <div className="space-y-3">
                    {challenges.filter(c => c.is_joined).slice(0, 2).map(c => (
                      <div key={c.id} className="bg-bg-hover/50 p-3 rounded-xl border border-border/50">
                        <p className="text-xs font-bold text-text truncate">{c.title}</p>
                        <div className="flex justify-between items-center mt-2 text-[10px] text-text-muted font-bold">
                          <span>Progression</span>
                          <span className="text-accent">{c.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-bg rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${c.progress || 0}%` }} />
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setActiveSubTab('challenges')} className="w-full text-center text-[10px] font-bold text-accent hover:text-accent-hover mt-2">
                      Voir tous les challenges →
                    </button>
                  </div>
                )}
              </div>

              {/* 8. Historique Activité */}
              <div className="glass-card rounded-2xl p-5 border border-border">
                <h3 className="font-extrabold text-text mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <History className="w-4.5 h-4.5 text-success" /> Historique
                </h3>
                {reservations.filter(r => parseDateAsLocal(r.course?.starts_at) < new Date()).length === 0 ? (
                  <p className="text-xs text-text-muted italic">Aucune séance passée.</p>
                ) : (
                  <div className="space-y-3">
                    {reservations.filter(r => parseDateAsLocal(r.course?.starts_at) < new Date()).slice(0, 3).map(r => (
                      <div key={r.id} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="text-xs font-bold text-text">{r.course?.name || 'Séance'}</p>
                          <p className="text-[10px] text-text-muted">{parseDateAsLocal(r.course?.starts_at).toLocaleDateString()}</p>
                        </div>
                        <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded font-bold">
                          Complété
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Objective & recommendations (Places restantes live) */}
            <div className="glass-card rounded-2xl p-5 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-text flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Target className="w-4.5 h-4.5 text-warning" /> {t('dashboard.adherent.objective')} & Live
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {Object.entries(objectiveLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setObjective(key); loadRecommendations(key) }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center border ${
                      objective === key
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-bg border-border text-text-muted hover:text-text hover:bg-bg-hover'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {recommendations && (
                <div className="space-y-3 mt-4 border-t border-border/40 pt-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-text">
                    <Flame className="w-4 h-4 text-warning" /> Fréquence : {recommendations.rule.frequency}
                  </div>
                  <p className="text-xs text-accent italic bg-accent/5 p-3 rounded-xl border border-accent/10">
                    💡 {recommendations.rule.tip}
                  </p>
                  
                  {/* 7. Places Restantes Live */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
                        Live Cours Recommandés
                      </p>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">
                        <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div> En direct
                      </span>
                    </div>
                    {recommendations.courses.slice(0, 3).map(c => {
                      const spotStatus = c.spots > 10 ? 'success' : (c.spots > 0 ? 'warning' : 'danger')
                      const spotText = c.spots > 10 ? 'Disponible' : (c.spots > 0 ? 'Presque complet' : 'Complet')
                      return (
                        <div key={c.id} className="flex items-center justify-between p-2.5 bg-bg-hover/50 border border-border/40 rounded-xl hover-card transition-all">
                          <div>
                            <p className="text-xs font-bold text-text">{c.name}</p>
                            <p className="text-[10px] text-text-muted">{c.coach} · {c.room}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-${spotStatus}/10 text-${spotStatus}`}>
                              {c.spots} places
                            </span>
                            <p className={`text-[9px] text-${spotStatus} mt-0.5 font-semibold`}>{spotText}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: COACHES ── */}
      {activeSubTab === 'coaches' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-text">Rencontrez nos Coachs de Gym</h2>
            <p className="text-xs text-text-muted">Consultez leurs profils, leurs spécialités, leurs horaires ou laissez-leur une évaluation.</p>
          </div>

          {coaches.length === 0 ? (
            <p className="text-text-muted text-xs py-10 text-center">Aucun coach disponible.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coaches.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleOpenCoachDetails(c.id)}
                  className="glass-card rounded-2xl border border-border p-5 hover-card relative overflow-hidden flex flex-col justify-between cursor-pointer"
                >
                  {/* Status badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      c.online_status === 'online' ? 'bg-success/15 text-success' : 'bg-text-muted/15 text-text-muted'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.online_status === 'online' ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
                      {c.online_status === 'online' ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>

                  <div>
                    {/* Header info */}
                    <div className="flex items-center gap-4 mb-4">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-xl object-cover border border-border shadow-sm shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl border border-border shadow-sm shrink-0 bg-accent/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-accent" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-text text-sm leading-snug">{c.name}</h3>
                        <p className="text-[10px] text-text-muted mt-0.5">Expérience : {c.experience} ans</p>
                      </div>
                    </div>

                    {/* Ratings */}
                    <div className="flex items-center gap-2.5 text-xs bg-bg-hover/40 p-2 rounded-xl border border-border/40 mb-3">
                      <span className="flex items-center gap-0.5 text-warning font-bold">
                        <Star className="w-3.5 h-3.5 fill-warning text-warning" /> {c.satisfaction_score}
                      </span>
                      <span className="text-text-muted border-l border-border pl-2.5">
                        Gym : <span className="font-bold text-text">{c.gym_name || 'I-Gym Club'}</span>
                      </span>
                    </div>

                    {c.bio && (
                      <p className="text-[11px] text-text-muted line-clamp-2 bg-bg-hover/20 p-2.5 rounded-lg border border-border/20 mb-4 italic">
                        "{c.bio}"
                      </p>
                    )}

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1">
                      {c.specialties.map(spec => (
                        <span key={spec} className="px-2 py-0.5 bg-accent/5 border border-accent/15 text-accent rounded-lg text-[10px] font-bold">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-accent font-bold">
                    <span>Voir planning & avis</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CHALLENGES ── */}
      {activeSubTab === 'challenges' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-text">Rejoignez un challenge et remportez des récompenses !</h2>
            <p className="text-xs text-text-muted">Participez à des challenges créés par nos experts, accumulez de l'XP et débloquez des badges exclusifs.</p>
          </div>

          {challenges.length === 0 ? (
            <p className="text-text-muted text-xs py-10 text-center">Aucun challenge disponible pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {challenges.map(ch => (
                <div key={ch.id} className="glass-card rounded-2xl border border-border p-5 hover-card relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-text text-base leading-tight flex items-center gap-1.5">
                      🏆 {ch.title}
                    </h3>
                    <p className="text-[11px] text-text-muted mt-2 leading-relaxed">{ch.description}</p>
                    
                    <div className="flex items-center gap-4 mt-4 bg-bg-hover/40 p-2.5 rounded-xl border border-border/40 text-xs">
                      <div>
                        Durée : <span className="font-bold text-text">{ch.duration_days} jours</span>
                      </div>
                      <div className="border-l border-border pl-4">
                        XP : <span className="font-bold text-accent">+{ch.xp_reward} XP</span>
                      </div>
                      <div className="border-l border-border pl-4 flex items-center gap-1">
                        Récompense : <span className="font-bold text-warning capitalize">{ch.badge_reward}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-text-muted mt-3">
                      Lancé par : <span className="font-bold text-text">Coach {ch.coach_name}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                      👥 {ch.participants_count || 0} participants inscrits
                    </span>
                    {ch.is_joined ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                        <Check className="w-4.5 h-4.5" /> Déjà inscrit (En cours)
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinChallenge(ch.id)}
                        className="bg-accent hover:bg-accent-hover text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all"
                      >
                        Rejoindre le challenge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SUBSCRIPTION ── */}
      {activeSubTab === 'subscription' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
          {/* Main card */}
          <div className="md:col-span-8 glass-card border border-border rounded-2xl p-6 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-text">Détails de mon abonnement</h2>
                  <p className="text-xs text-text-muted mt-0.5">Retrouvez toutes les informations sur votre formule active.</p>
                </div>
                <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/10 animate-pulse">
                  Actif
                </span>
              </div>

              {/* Grid detail summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-bg-hover/30 border border-border/40 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Formule</span>
                  <p className="text-base font-extrabold text-accent capitalize">{user?.subscription?.plan || "Mensuel"}</p>
                </div>
                <div className="bg-bg-hover/30 border border-border/40 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Tarif</span>
                  <p className="text-base font-extrabold text-accent">{user?.subscription?.price || 300} {user?.gym?.currency || "DH"}</p>
                </div>
                <div className="bg-bg-hover/30 border border-border/40 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Date de fin</span>
                  <p className="text-base font-extrabold text-accent">
                    {user?.subscription?.end_date ? new Date(user.subscription.end_date).toLocaleDateString() : "Aucune"}
                  </p>
                </div>
              </div>

              {/* Expiry alerts */}
              {user?.subscription?.days_remaining !== null && user?.subscription?.days_remaining <= 7 && (
                <div className="p-4 bg-danger/10 border border-danger/25 text-danger rounded-xl text-xs font-semibold flex items-center gap-2 mb-6 animate-pulse">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>
                    Attention ! Votre abonnement expire dans {user.subscription.days_remaining} jours.
                    Veuillez vous présenter à l'accueil de votre club pour le renouveler.
                  </span>
                </div>
              )}

              {/* Inclusions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">Avantages Inclus</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(user?.gym?.advantages ? (Array.isArray(user.gym.advantages) ? user.gym.advantages : JSON.parse(user.gym.advantages)) : ["Accès illimité à la salle de sport", "Accès aux douches et casiers", "Suivi d'objectifs intelligent"]).map((adv, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-text-muted">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-text-dim mt-8 pt-4 border-t border-border/40 text-center font-bold tracking-wider uppercase">
              I-GYM SECURE CHECKOUT
            </p>
          </div>

          {/* Right column: Gym Contact Info */}
          <div className="md:col-span-4 glass-card border border-border rounded-2xl p-6 bg-bg-card/40 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Votre Salle</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-extrabold text-text text-base">{user?.gym?.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{user?.gym?.city}</p>
                </div>
                {user?.gym?.address && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-dim uppercase font-bold tracking-wider">Adresse</span>
                    <p className="text-xs text-text-muted">{user.gym.address}</p>
                  </div>
                )}
                {user?.gym?.phone && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-dim uppercase font-bold tracking-wider">Téléphone</span>
                    <p className="text-xs text-text-muted">{user.gym.phone}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/40 space-y-2">
              <span className="text-[10px] text-text-dim uppercase font-bold tracking-wider block">Des questions ?</span>
              <p className="text-xs text-text-muted leading-tight">
                Pour toute demande de résiliation, de changement de formule ou de suspension temporaire, contactez directement l'accueil.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: COACH DETAILS, CALENDAR, REVIEWS & REVIEW FORM ── */}
      {selectedCoachDetails && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCoachDetails(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
        >
          <div className="bg-bg border border-border w-[95%] sm:w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-scaleUp my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-bg-hover">
              <div className="flex items-center gap-3">
                <img src={selectedCoachDetails.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h2 className="text-base font-extrabold text-text leading-tight">{selectedCoachDetails.name}</h2>
                  <p className="text-[10px] text-text-muted">{selectedCoachDetails.gym_name || 'I-Gym Club'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCoachDetails(null)}
                className="p-1.5 rounded-lg text-text-muted hover:bg-border transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Bio & Experience */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Biographie</p>
                <p className="text-xs text-text leading-relaxed bg-bg-hover/30 p-3.5 rounded-xl border border-border/40 italic">
                  "{selectedCoachDetails.bio || 'Aucune biographie rédigée.'}"
                </p>
                <p className="text-xs text-text-muted">
                  Années d'expérience professionnelle : <span className="font-bold text-text">{selectedCoachDetails.experience} ans</span>
                </p>
              </div>

              {/* Specialties */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Domaines d'enseignement</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCoachDetails.specialties?.map(spec => (
                    <span key={spec} className="px-2.5 py-1 bg-accent/10 border border-accent/20 text-accent rounded-lg text-[10px] font-bold">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Weekly Availability Grid */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Disponibilités hebdomadaires</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedCoachDetails.availabilities?.map(av => (
                    <div key={av.day_of_week} className="p-2.5 bg-bg-hover/60 border border-border/40 rounded-xl text-center space-y-1">
                      <p className="text-[10px] font-bold text-text">{av.day_of_week}</p>
                      {av.is_off ? (
                        <p className="text-[9px] text-text-muted font-bold italic">Repos / Off</p>
                      ) : (
                        <p className="text-[9px] text-text-muted">
                          {av.start_time.substring(0, 5)} - {av.end_time.substring(0, 5)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews & Average score */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Avis de nos membres</p>
                  <span className="flex items-center gap-0.5 text-warning font-bold text-xs bg-warning/10 px-2 py-0.5 rounded">
                    ★ {selectedCoachDetails.satisfaction_score} / 5
                  </span>
                </div>

                {selectedCoachDetails.reviews?.length === 0 ? (
                  <p className="text-[11px] text-text-muted italic text-center py-4">Aucune évaluation n'a été laissée à ce coach. Soyez le premier !</p>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {selectedCoachDetails.reviews?.map(rev => (
                      <div key={rev.id} className="p-3 bg-bg-hover/30 border border-border/30 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-text">{rev.user_name}</span>
                          <span className="text-warning font-bold">★ {rev.rating}</span>
                        </div>
                        {rev.comment && <p className="text-xs text-text-muted italic">"{rev.comment}"</p>}
                        <p className="text-[9px] text-text-muted text-right">{rev.created_at}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Review form */}
              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Évaluer ce coach</p>
                
                {reviewSuccess && (
                  <p className="text-xs text-success bg-success-muted/10 p-2 border border-success/30 rounded-lg">
                    {reviewSuccess}
                  </p>
                )}

                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-muted">Sélectionnez votre note :</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(starNum => (
                        <button
                          key={starNum}
                          type="button"
                          onClick={() => setRatingInput(starNum)}
                          className="focus:outline-none"
                        >
                          <Star className={`w-5 h-5 ${starNum <= ratingInput ? 'fill-warning text-warning' : 'text-text-muted'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Laissez un commentaire constructif..."
                      className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-accent"
                    />
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" /> Évaluer
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-bg-hover border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedCoachDetails(null)}
                className="bg-accent text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Streak Leaderboard (Popover) */}
      <div className={`fixed bottom-6 ${lang === 'ar' ? 'left-6' : 'right-6'} z-50 flex flex-col items-end`}>
        {/* Transparent Backdrop for clicking outside */}
        {isStreakModalOpen && (
          <div
            onClick={() => setIsStreakModalOpen(false)}
            className="fixed inset-0 z-40"
          />
        )}

        {/* Popover */}
        {isStreakModalOpen && (
          <div className={`absolute bottom-full mb-4 ${lang === 'ar' ? 'left-0' : 'right-0'} w-[320px] max-w-[calc(100vw-2rem)] bg-bg border border-border rounded-3xl shadow-2xl animate-scaleUp z-50 overflow-hidden`}>
            {/* Popover Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-bg-hover">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500 animate-bounce" />
                <h2 className="text-xs font-extrabold text-text">Streaks du Club ({user?.gym?.name})</h2>
              </div>
              <button
                onClick={() => setIsStreakModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-border transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popover Body */}
            <div className="p-2 space-y-2 max-h-[350px] overflow-y-auto">
              {streakLoading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  <p className="text-[10px] text-text-muted">Chargement...</p>
                </div>
              ) : streakLeaderboard.length === 0 ? (
                <p className="text-[10px] text-text-muted italic text-center py-4">Aucun membre trouvé.</p>
              ) : (
                <div className="space-y-1.5">
                  {streakLeaderboard.map((member, idx) => (
                    <div
                      key={member.user_id}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                        member.is_me
                          ? 'bg-accent/10 border-accent'
                          : 'bg-bg-hover/30 border-border/30 hover:bg-bg-hover/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 text-center text-[10px] font-black ${
                          idx === 0 ? 'text-yellow-500 text-sm' :
                          idx === 1 ? 'text-gray-400 text-sm' :
                          idx === 2 ? 'text-amber-600 text-sm' : 'text-text-muted'
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-border overflow-hidden shrink-0 border border-border">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-text-muted capitalize bg-accent/5">
                              {member.name.substring(0, 2)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-text truncate max-w-[120px]">{member.name}</p>
                          <p className="text-[8px] text-text-muted">Niveau {member.level || 1}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span className="text-[10px] font-black text-orange-500">{member.streak_days} j</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={isStreakModalOpen ? () => setIsStreakModalOpen(false) : handleOpenStreakLeaderboard}
          className="relative z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-110 transition-all duration-300 group"
          title="Classement de Streak du Club"
        >
          {isStreakModalOpen ? (
            <X className="w-6 h-6 transition-transform" />
          ) : (
            <Flame className="w-7 h-7 animate-pulse group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    </div>
  )
}

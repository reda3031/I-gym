import React, { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { useTranslation } from '../../context/TranslationContext'
import { BookOpen, Search, Loader2, Plus, Edit, Trash2, X, Check, AlertCircle } from 'lucide-react'
import { usePolling } from '../../hooks/usePolling'

const COURSE_TYPES = ['Crossfit', 'Yoga', 'Cardio', 'Musculation', 'Boxing', 'Pilates', 'HIIT', 'Stretching']

export default function AdminCoursesPage() {
  const { t, lang } = useTranslation()
  const [courses, setCourses] = useState([])
  const [coaches, setCoaches] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)

  // Form State
  const [name, setName] = useState('')
  const [type, setType] = useState('Musculation')
  const [coachId, setCoachId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [maxCapacity, setMaxCapacity] = useState(15)
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const [coursesRes, coachesRes, roomsRes] = await Promise.all([
        api.get('/admin/courses'),
        api.get('/admin/coaches'),
        api.get('/rooms')
      ])
      setCourses(coursesRes.data || [])
      setCoaches(coachesRes.data || [])
      setRooms(roomsRes.data || [])
    } catch (err) {
      setError(err.response?.data?.message || t('common.errLoad') || 'Erreur de chargement')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  usePolling(() => {
    fetchData(true)
  }, 5000)

  const formatDatetimeLocal = (dateStr) => {
    if (!dateStr) return ''
    const isoStr = String(dateStr).replace(' ', 'T').split('Z')[0].split('+')[0]
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return ''
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const openCreateModal = () => {
    setEditingCourse(null)
    setName('')
    setType('Musculation')
    setCoachId(coaches[0]?.id || '')
    setRoomId(rooms[0]?.id || '')
    
    // Set default starts_at to tomorrow 10:00 and ends_at to tomorrow 11:00
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yyyy = tomorrow.getFullYear()
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const dd = String(tomorrow.getDate()).padStart(2, '0')
    
    setStartsAt(`${yyyy}-${mm}-${dd}T10:00`)
    setEndsAt(`${yyyy}-${mm}-${dd}T11:00`)
    setMaxCapacity(15)
    setDescription('')
    setFormError('')
    setIsModalOpen(true)
  }

  const openEditModal = (course) => {
    setEditingCourse(course)
    setName(course.name)
    setType(course.type)
    setCoachId(course.coach?.id || '')
    setRoomId(course.room?.id || '')
    setStartsAt(formatDatetimeLocal(course.starts_at))
    setEndsAt(formatDatetimeLocal(course.ends_at))
    setMaxCapacity(course.max_capacity)
    setDescription(course.description || '')
    setFormError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitLoading(true)

    const payload = {
      name,
      type,
      coach_id: coachId ? parseInt(coachId) : null,
      room_id: roomId ? parseInt(roomId) : null,
      starts_at: startsAt,
      ends_at: endsAt,
      max_capacity: parseInt(maxCapacity),
      description
    }

    try {
      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse.id}`, payload)
        setSuccess('Cours mis à jour avec succès.')
      } else {
        await api.post('/admin/courses', payload)
        setSuccess('Cours créé avec succès.')
      }
      setIsModalOpen(false)
      fetchData()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de la sauvegarde du cours.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.courses.confirmDelete') || 'Voulez-vous vraiment supprimer ce cours ?')) return
    setError('')
    setSuccess('')
    try {
      await api.delete(`/admin/courses/${id}`)
      setSuccess(t('admin.courses.successDelete') || 'Cours supprimé.')
      setCourses(prev => prev.filter(c => c.id !== id))
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(t('admin.courses.errDelete') || 'Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-3xl font-extrabold text-text tracking-tight">{t('nav.courses')}</h1>
            <p className="text-text-muted text-sm mt-1">Gérez et planifiez les séances de sport de votre club.</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl font-bold shadow-lg shadow-accent-muted/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          {t('admin.courses.newCourse') || 'Nouveau Cours'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-success/15 border border-success/30 text-success rounded-xl text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-bg-input/30 text-text-dim text-xs uppercase tracking-wider border-b border-border/50">
                  <th className="px-6 py-4 font-bold">{t('admin.table.name') || 'Nom'}</th>
                  <th className="px-6 py-4 font-bold">{t('common.type') || 'Type'}</th>
                  <th className="px-6 py-4 font-bold">{t('common.coach') || 'Coach'}</th>
                  <th className="px-6 py-4 font-bold">{t('common.dateTime') || 'Date & Heure'}</th>
                  <th className="px-6 py-4 font-bold">{t('common.spots') || 'Places'}</th>
                  <th className="px-6 py-4 font-bold text-right">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {courses.map(c => {
                  const isCancelled = c.status === 'cancelled'
                  return (
                    <tr key={c.id} className={`hover:bg-bg-hover transition-colors ${isCancelled ? 'opacity-65 bg-danger-muted/5' : ''}`}>
                      <td className="px-6 py-4 font-semibold text-text">
                        <div className="flex items-center gap-2">
                          <span className={isCancelled ? 'line-through text-text-muted' : ''}>{c.name}</span>
                          {isCancelled && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-danger/15 text-danger rounded-md uppercase tracking-wider">
                              Annulé
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-muted">{c.type}</td>
                      <td className="px-6 py-4 text-text-muted">{c.coach?.name || '—'}</td>
                      <td className="px-6 py-4 text-text-muted">
                        {(() => {
                          const tStr = String(c.starts_at).replace(' ', 'T')
                          const localStr = tStr.split('Z')[0].split('+')[0]
                          const d = new Date(localStr)
                          const dt = isNaN(d.getTime()) ? new Date(tStr) : d
                          return isNaN(dt.getTime()) ? c.starts_at : dt.toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        {isCancelled ? (
                          <span className="text-xs text-text-muted italic">Annulé</span>
                        ) : (
                          (() => {
                            const colorMap = {
                              green: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
                              orange: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
                              red: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20'
                            }
                            const badgeClass = colorMap[c.color] || 'bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20'
                            return (
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${badgeClass}`}>
                                {c.current_reservations} / {c.max_capacity}
                              </span>
                            )
                          })()
                        )}
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-text-dim hover:text-accent bg-bg-input rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-text-dim hover:text-danger bg-bg-input rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {courses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-text-muted">{t('admin.courses.noCourses') || 'Aucun cours trouvé.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Creation / Edition */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-bg border border-border w-[95%] sm:w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between p-6 border-b border-border bg-bg-hover">
              <h2 className="text-xl font-bold text-text flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-accent" />
                {editingCourse ? 'Modifier la séance' : 'Créer une nouvelle séance'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-border transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Nom du cours *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Séance Jambes / Yoga Vinyasa"
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Type de cours *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="select-modern text-sm"
                  >
                    {COURSE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Coach */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Coach *</label>
                  <select
                    required
                    value={coachId}
                    onChange={(e) => setCoachId(e.target.value)}
                    className="select-modern text-sm"
                  >
                    <option value="">Sélectionner un coach</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Room */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Salle</label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="select-modern text-sm"
                  >
                    <option value="">Aucune salle</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Starts At */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Début du cours *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>

                {/* Ends At */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Fin du cours *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>

                {/* Max Capacity */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Capacité maximale *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="500"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Description (Optionnel)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectif de la séance, matériel nécessaire, niveau..."
                  rows="3"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-bg-hover hover:bg-border text-text py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-accent-muted/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingCourse ? 'Mettre à jour' : 'Planifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

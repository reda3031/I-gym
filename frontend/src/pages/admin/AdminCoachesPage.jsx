import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { Plus, Edit2, Trash2, Mail, Phone, Calendar, Star, Check, Award, GraduationCap, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

const SPECIALTY_OPTIONS = ['Musculation', 'Crossfit', 'Cardio', 'Yoga', 'Boxing', 'Fitness', 'HIIT', 'Pilates']

export default function AdminCoachesPage() {
  const { t } = useTranslation()
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoach, setEditingCoach] = useState(null)
  
  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState(1)
  const [selectedSpecialties, setSelectedSpecialties] = useState([])
  const [avatar, setAvatar] = useState('')
  
  const fetchCoaches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/coaches')
      setCoaches(res.data)
      setError('')
    } catch (err) {
      setError(t('admin.coaches.errLoad') || 'Impossible de charger les coachs de la gym.')
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchCoaches()
  }, [fetchCoaches])

  const openCreateModal = () => {
    setEditingCoach(null)
    setName('')
    setEmail('')
    setPhone('')
    setBio('')
    setExperience(1)
    setSelectedSpecialties([])
    setAvatar('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150')
    setIsModalOpen(true)
  }

  const openEditModal = (coach) => {
    setEditingCoach(coach)
    setName(coach.name)
    setEmail(coach.email)
    setPhone(coach.phone || '')
    setBio(coach.bio || '')
    setExperience(coach.experience || 1)
    setSelectedSpecialties(coach.specialties || [])
    setAvatar(coach.avatar || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150')
    setIsModalOpen(true)
  }

  const handleSpecialtyToggle = (spec) => {
    if (selectedSpecialties.includes(spec)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== spec))
    } else {
      setSelectedSpecialties([...selectedSpecialties, spec])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (selectedSpecialties.length === 0) {
      setError(t('admin.coaches.errSelectSpecialty') || 'Veuillez sélectionner au moins une spécialité.')
      return
    }

    const payload = {
      name,
      email,
      phone,
      bio,
      experience: parseInt(experience),
      specialties: selectedSpecialties,
      avatar
    }

    try {
      if (editingCoach) {
        await api.put(`/admin/coaches/${editingCoach.id}`, payload)
        setSuccess(t('admin.coaches.successUpdate') || 'Profil du coach mis à jour avec succès.')
      } else {
        await api.post('/admin/coaches', payload)
        setSuccess(t('admin.coaches.successCreate') || 'Nouveau compte coach créé avec succès (mot de passe temporaire: password).')
      }
      setIsModalOpen(false)
      fetchCoaches()
    } catch (err) {
      setError(err.response?.data?.message || t('common.errSave') || 'Une erreur est survenue lors de la sauvegarde.')
    }
  }

  const handleDelete = async (coachId) => {
    if (!window.confirm(t('admin.coaches.deleteConfirm') || 'Êtes-vous sûr de vouloir supprimer ce coach ? Cette action supprimera également toutes ses séances associées.')) {
      return
    }
    setError('')
    setSuccess('')
    try {
      await api.delete(`/admin/coaches/${coachId}`)
      setSuccess(t('admin.coaches.successDelete') || 'Le coach a été supprimé de la base de données.')
      fetchCoaches()
    } catch (err) {
      setError(t('admin.coaches.errDelete') || 'Impossible de supprimer ce coach.')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-accent" /> {t('admin.coaches.title') || 'Gestion des Coachs'}
          </h1>
          <p className="text-text-muted text-sm mt-1">{t('admin.coaches.subtitle') || 'Supervisez et gérez les entraîneurs de votre club, attribuez leurs spécialités et créez leurs accès.'}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-accent-muted/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5" /> {t('admin.coaches.newCoach') || 'Nouveau Coach'}
        </button>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : coaches.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-border">
          <GraduationCap className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-text mb-1">{t('admin.coaches.noCoaches') || 'Aucun coach enregistré'}</h3>
          <p className="text-text-muted text-sm max-w-sm mx-auto mb-6">{t('admin.coaches.noCoachesSub') || 'Commencez par ajouter un entraîneur pour qu\'il puisse dispenser des séances dans votre club.'}</p>
          <button onClick={openCreateModal} className="text-accent hover:underline text-sm font-semibold">
            {t('admin.coaches.addFirst') || 'Ajouter le premier coach →'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map((c) => (
            <div key={c.id} className="glass-card rounded-2xl border border-border p-6 hover-card relative overflow-hidden flex flex-col justify-between">
              {/* Status Indicator */}
              <div className="absolute top-4 right-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  c.online_status === 'online' ? 'bg-success/15 text-success' : 'bg-text-muted/10 text-text-muted'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${c.online_status === 'online' ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
                  {c.online_status === 'online' ? (t('common.online') || 'En ligne') : (t('common.offline') || 'Hors ligne')}
                </span>
              </div>

              <div>
                {/* Header Info */}
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-border shadow-md"
                  />
                  <div>
                    <h3 className="font-bold text-text text-lg leading-snug">{c.name}</h3>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <Award className="w-3.5 h-3.5 text-warning" /> {c.experience} {t('common.yearsExp') || 'ans d\'expérience'}
                    </p>
                  </div>
                </div>

                {/* Ratings */}
                <div className="flex items-center gap-3 bg-bg/40 p-2.5 rounded-xl border border-border/50 text-sm mb-4">
                  <div className="flex items-center gap-1 text-warning font-bold">
                    <Star className="w-4 h-4 fill-warning text-warning" /> {c.satisfaction_score}
                  </div>
                  <div className="text-xs text-text-muted border-l border-border pl-3">
                    {t('common.popularity') || 'Popularité :'} <span className="font-bold text-text">{(c.popularity_score || 5.0) * 20}%</span>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5 text-sm mb-4">
                  <p className="text-text-muted flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 text-text-muted/70" /> {c.email}
                  </p>
                  {c.phone && (
                    <p className="text-text-muted flex items-center gap-2">
                      <Phone className="w-4 h-4 text-text-muted/70" /> {c.phone}
                    </p>
                  )}
                </div>

                {/* Bio snippet */}
                {c.bio && (
                  <p className="text-xs text-text-muted line-clamp-3 bg-bg-hover/30 p-3 rounded-xl border border-border/40 mb-4 italic">
                    "{c.bio}"
                  </p>
                )}

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {c.specialties.map(spec => (
                    <span key={spec} className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent rounded-lg text-xs font-medium">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-4 border-t border-border mt-auto">
                <button
                  onClick={() => openEditModal(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-bg hover:bg-bg-hover border border-border text-text text-sm font-semibold py-2 px-3 rounded-xl transition-all"
                >
                  <Edit2 className="w-4 h-4" /> {t('common.edit') || 'Modifier'}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 bg-danger/10 hover:bg-danger/25 border border-danger/20 text-danger rounded-xl transition-all"
                  title={t('admin.coaches.deleteTooltip') || 'Supprimer ce coach'}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Creation / Edition */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-bg border border-border w-[95%] sm:w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between p-6 border-b border-border bg-bg-hover">
              <h2 className="text-xl font-bold text-text flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-accent" /> {editingCoach ? (t('common.edit') || 'Modifier le Coach') : (t('admin.coaches.newCoach') || 'Nouveau Coach')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-border transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">{t('common.fullName') || 'Nom complet *'}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Coach Youssef"
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">{t('common.emailAddress') || 'Adresse Email *'}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="youssef@igym.ma"
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">{t('common.phone') || 'Téléphone'}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+212 600 000 000"
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">{t('common.yearsExpLabel') || 'Années d\'expérience *'}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>

              {/* Avatar Url */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">{t('common.avatarUrl') || 'Lien Photo Avatar'}</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">{t('common.bio') || 'Description Coach (Bio)'}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Parlez de son parcours, ses certifications, ses méthodes d'entraînement..."
                  rows="3"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-accent text-sm"
                />
              </div>

              {/* Specialties checkboxes */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-2">{t('common.specialties') || 'Spécialités dispensées *'}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SPECIALTY_OPTIONS.map((spec) => {
                    const active = selectedSpecialties.includes(spec)
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleSpecialtyToggle(spec)}
                        className={`flex items-center justify-between px-3 py-2 border rounded-xl text-xs font-semibold transition-all ${
                          active
                            ? 'bg-accent/15 border-accent text-accent shadow-sm'
                            : 'bg-bg border-border text-text hover:bg-bg-hover'
                        }`}
                      >
                        {spec}
                        {active && <Check className="w-3.5 h-3.5 text-accent" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions Button */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-bg-hover hover:bg-border text-text py-2.5 rounded-xl text-sm font-semibold transition-all"
                >
                  {t('common.cancel') || 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-accent-muted/10 transition-all"
                >
                  {editingCoach ? (t('common.save') || 'Mettre à jour') : (t('common.confirm') || 'Créer le Coach')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

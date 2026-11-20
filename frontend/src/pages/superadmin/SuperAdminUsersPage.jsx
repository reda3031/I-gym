import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import {
  Users, Building2, MapPin, Search, Loader2,
  Calendar, ChevronLeft, ChevronRight, UserCheck, ShieldAlert, LogIn
} from 'lucide-react'

export default function SuperAdminUsersPage() {
  const { t, lang } = useTranslation()
  const { impersonateUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [simulatingId, setSimulatingId] = useState(null)
  
  const handleImpersonate = async (userId, userRole) => {
    try {
      setSimulatingId(userId)
      await impersonateUser(userId)
      if (userRole === 'admin') navigate('/admin')
      else if (userRole === 'coach') navigate('/coach')
      else navigate('/adherent')
    } catch (err) {
      console.error(err)
    } finally {
      setSimulatingId(null)
    }
  }
  const role = searchParams.get('role') || 'adherent' // Default to adherent/member
  const urlGymId = searchParams.get('gym_id') || ''

  const [users, setUsers] = useState([])
  const [gyms, setGyms] = useState([])
  const [selectedGym, setSelectedGym] = useState(urlGymId)
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [objectiveType, setObjectiveType] = useState('')
  const [level, setLevel] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sync selectedGym if URL param changes
  useEffect(() => {
    setSelectedGym(searchParams.get('gym_id') || '')
  }, [searchParams])

  // Reset other filters on role change
  useEffect(() => {
    setGender('')
    setObjectiveType('')
    setLevel('')
  }, [role])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch gyms for the dropdown filter
  useEffect(() => {
    api.get('/gyms')
      .then(({ data }) => {
        setGyms(data)
      })
      .catch(console.error)
  }, [])

  // Fetch users based on role, selectedGym, search, and page
  useEffect(() => {
    setLoading(true)
    const params = {
      role,
      page: currentPage,
    }
    if (selectedGym) params.gym_id = selectedGym
    if (search) params.search = search
    if (role === 'adherent') {
      if (gender) params.gender = gender
      if (objectiveType) params.objective_type = objectiveType
      if (level) params.level = level
    }

    api.get('/super-admin/users', { params })
      .then(({ data }) => {
        setUsers(data.data || [])
        setCurrentPage(data.current_page || 1)
        setTotalPages(data.last_page || 1)
        setTotalCount(data.total || 0)
        setError('')
      })
      .catch((err) => {
        console.error(err)
        setError(t('superadmin.users.errFetch') || 'Impossible de récupérer les utilisateurs.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [role, selectedGym, search, gender, objectiveType, level, currentPage, t])

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [role, selectedGym, search, gender, objectiveType, level])

  // Display title based on role query param
  const getRoleTitle = () => {
    switch (role) {
      case 'admin':
        return t('nav.admins') || 'Administrateurs'
      case 'coach':
        return t('nav.coaches') || "Personnel d'abonnement"
      default:
        return t('nav.members') || 'Adhérents'
    }
  }

  const getRoleColor = () => {
    switch (role) {
      case 'admin':
        return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
      case 'coach':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
      default:
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg-card/30 p-5 rounded-2xl border border-border/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl border ${getRoleColor()}`}>
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-text uppercase tracking-tight">
              {getRoleTitle()}
            </h1>
          </div>
          <p className="text-text-muted text-xs font-semibold mt-1">
            {t('superadmin.users.subtitle') || 'Gestion globale des utilisateurs de la franchise I-Gym'}
          </p>
        </div>
        <div className="text-xs bg-bg-input px-3 py-1.5 rounded-xl font-bold text-text-muted border border-border/30">
          {t('common.total') || 'Total'}: {totalCount} {getRoleTitle()}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 bg-bg-card/20 p-4 rounded-2xl border border-border/40 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
            <input
              type="text"
              placeholder={t('superadmin.users.searchPlaceholder') || 'Rechercher par nom, prénom ou e-mail...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-input/50 border border-border/40 focus:border-accent text-text text-xs rounded-xl focus:outline-none transition-colors"
            />
          </div>

          {/* Gym Filter */}
          <div className="w-full md:w-64">
            <select
              value={selectedGym}
              onChange={(e) => setSelectedGym(e.target.value)}
              className="select-modern"
            >
              <option value="">{t('superadmin.users.allClubs') || 'Tous les clubs'}</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Extra filters for members/adhérents only */}
        {role === 'adherent' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/20">
            {/* Gender Filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-text-dim mb-1.5">{t('profile.gender') || 'Sexe'}</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="select-modern"
              >
                <option value="">{t('superadmin.users.allGenders') || 'Tous les sexes'}</option>
                <option value="homme">{t('profile.genderMale') || 'Homme'}</option>
                <option value="femme">{t('profile.genderFemale') || 'Femme'}</option>
              </select>
            </div>

            {/* Objective Filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-text-dim mb-1.5">{t('superadmin.users.fitnessGoal') || 'Objectif Fitness'}</label>
              <select
                value={objectiveType}
                onChange={(e) => setObjectiveType(e.target.value)}
                className="select-modern"
              >
                <option value="">{t('superadmin.users.allGoals') || 'Tous les objectifs'}</option>
                <option value="perte_de_poids">{t('profile.goalWeightLoss') || 'Perte de poids'}</option>
                <option value="prise_de_masse">{t('profile.goalMuscleGain') || 'Prise de masse'}</option>
                <option value="endurance">{t('profile.goalEndurance') || 'Endurance'}</option>
                <option value="flexibilite">{t('profile.goalFlexibility') || 'Flexibilité'}</option>
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-text-dim mb-1.5">{t('superadmin.users.franchiseLevel') || 'Niveau de Franchise'}</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="select-modern"
              >
                <option value="">{t('superadmin.users.allLevels') || 'Tous les niveaux'}</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content State */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-text">
          <div className="text-center">
            <Loader2 className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted text-sm">{t('common.loading')}</p>
          </div>
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto my-12 p-6 glass-card rounded-2xl border border-danger-muted text-center text-text">
          <ShieldAlert className="w-12 h-12 text-danger mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">{t('common.error')}</h3>
          <p className="text-text-muted text-sm mb-4">{error}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card rounded-2xl py-20 text-center border border-border/30">
          <Users className="w-12 h-12 text-text-dim mx-auto mb-3" />
          <p className="text-text font-bold">{t('superadmin.users.noUsers') || 'Aucun utilisateur trouvé'}</p>
          <p className="text-text-muted text-xs mt-1">{t('superadmin.users.noUsersHelp') || "Essayer d'élargir vos filtres ou de modifier votre recherche."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Users Table */}
          <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bg-input/30 text-text-dim font-bold uppercase tracking-wider border-b border-border/30">
                    <th className="py-4 px-6">{t('superadmin.users.thUser') || 'Utilisateur'}</th>
                    <th className="py-4 px-6">{t('admin.table.email') || 'E-mail'}</th>
                    <th className="py-4 px-6">{t('superadmin.users.thClubCity') || 'Club / Ville'}</th>
                    {role === 'adherent' && (
                      <>
                        <th className="py-4 px-6 text-center">{t('profile.age') || 'Âge'}</th>
                        <th className="py-4 px-6 text-center">{t('profile.height') || 'Taille'}</th>
                        <th className="py-4 px-6 text-center">{t('profile.weight') || 'Poids'}</th>
                        <th className="py-4 px-6 text-center">{t('profile.gender') || 'Sexe'}</th>
                      </>
                    )}
                    <th className="py-4 px-6 text-center">{t('superadmin.users.thRegistrationDate') || "Date d'inscription"}</th>
                    <th className="py-4 px-6 text-right">{t('common.actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-medium">
                  {users.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-input/20 transition-colors duration-300">
                      {/* Name & Monogram */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm
                            ${role === 'admin' ? 'bg-indigo-500/10 text-indigo-500' : role === 'coach' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}
                          `}>
                            {item.first_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-text text-sm">
                              {item.first_name} {item.last_name}
                            </p>
                            <p className="text-[10px] text-text-muted mt-0.5 capitalize">
                              {t('superadmin.users.role') || 'Rôle'}: {item.role}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 text-text font-mono">
                        {item.email}
                      </td>

                      {/* Gym Name & City */}
                      <td className="py-4 px-6">
                        {item.gym ? (
                          <>
                            <p className="text-text font-bold flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-text-dim" />
                              {item.gym.name}
                            </p>
                            <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-text-dim" />
                              {item.gym.city}
                            </p>
                          </>
                        ) : (
                          <span className="text-text-muted italic">{t('superadmin.users.noClub') || 'Sans club'}</span>
                        )}
                      </td>

                      {/* Physical info if role is adherent */}
                      {role === 'adherent' && (
                        <>
                          <td className="py-4 px-6 text-center font-semibold text-text">
                            {item.age} {t('profile.years') || 'ans'}
                          </td>
                          <td className="py-4 px-6 text-center text-text-muted">
                            {item.height ? `${item.height} cm` : '—'}
                          </td>
                          <td className="py-4 px-6 text-center text-text-muted">
                            {item.weight ? `${item.weight} kg` : '—'}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {item.gender ? (
                              <span className="px-2 py-0.5 rounded bg-bg-input text-text-muted font-bold uppercase text-[9px]">
                                {item.gender === 'homme' ? (t('profile.genderMale') || 'Homme') : item.gender === 'femme' ? (t('profile.genderFemale') || 'Femme') : item.gender}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </>
                      )}

                      {/* Registration Date */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 text-text-muted">
                          <Calendar className="w-3.5 h-3.5 text-text-dim" />
                          <span>
                            {new Date(item.created_at).toLocaleDateString(lang || 'fr', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions (Simulation) */}
                      <td className="py-4 px-6 text-right">
                        {item.role !== 'super_admin' ? (
                          <button
                            onClick={() => handleImpersonate(item.id, item.role)}
                            disabled={simulatingId !== null}
                            title={t('superadmin.users.impersonateTooltip') || "Connexion sécurisée en tant que cet utilisateur. Les actions seront auditées par sécurité."}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white transition-all duration-300 border border-orange-500/20 disabled:opacity-50 cursor-pointer"
                          >
                            {simulatingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <LogIn className="w-3.5 h-3.5" />
                            )}
                            {t('superadmin.users.loginAs') || 'Login As'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-text-muted italic">{t('superadmin.users.inaccessible') || 'Inaccessible'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-bg-card/20 p-4 rounded-xl border border-border/40">
              <span className="text-xs text-text-muted">
                {t('profile.page') || 'Page'} {currentPage} {t('common.of') || 'sur'} {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-2 rounded-lg bg-bg-input hover:bg-bg-input/80 border border-border/30 disabled:opacity-50 text-text transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-2 rounded-lg bg-bg-input hover:bg-bg-input/80 border border-border/30 disabled:opacity-50 text-text transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

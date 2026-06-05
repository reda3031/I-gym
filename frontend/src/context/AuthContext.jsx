import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(localStorage.getItem('igym_token'))
  const [loading, setLoading] = useState(true)

  // Charger le profil utilisateur au démarrage si token présent
  useEffect(() => {
    if (token) {
      api.get('/me')
        .then(({ data }) => setUser(data))
        .catch(() => {
          localStorage.removeItem('igym_token')
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/login', { email, password })
    localStorage.setItem('igym_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (fields) => {
    const { data } = await api.post('/register', fields)
    localStorage.setItem('igym_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/logout') } catch {}
    localStorage.removeItem('igym_token')
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/me')
    setUser(data)
    return data
  }, [])

  const impersonateUser = useCallback(async (targetUserId) => {
    localStorage.setItem('igym_super_token', token)
    const { data } = await api.post(`/super-admin/impersonate/${targetUserId}`)
    localStorage.setItem('igym_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [token])

  const exitImpersonation = useCallback(async () => {
    const superToken = localStorage.getItem('igym_super_token')
    if (!superToken) return
    const targetUserId = user?.id

    // Restaure le token du Super Admin
    localStorage.setItem('igym_token', superToken)
    localStorage.removeItem('igym_super_token')
    setToken(superToken)

    try {
      if (targetUserId) {
        // Appelle le backend en utilisant le token Super Admin restauré
        await api.post('/super-admin/stop-impersonate', { target_user_id: targetUserId })
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de fin de simulation:", err)
    }

    const { data } = await api.get('/me')
    setUser(data)
    return data
  }, [user])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, impersonateUser, exitImpersonation }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

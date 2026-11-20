import axios from 'axios'

// Instance Axios centralisée pour toutes les requêtes API
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
})

// Intercepteur requête : ajouter le token Bearer automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('igym_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur réponse : gérer 401 (token expiré)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('igym_token')
      localStorage.removeItem('igym_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

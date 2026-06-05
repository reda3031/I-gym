import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Welcome from './pages/Welcome'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminGymPage from './pages/admin/AdminGymPage'
import AdminCoursesPage from './pages/admin/AdminCoursesPage'
import AdminMembersPage from './pages/admin/AdminMembersPage'
import AdminCoachesPage from './pages/admin/AdminCoachesPage'
import AdminReservationsPage from './pages/admin/AdminReservationsPage'
import AdminSubscriptions from './pages/admin/AdminSubscriptions'
import CoachDashboard from './pages/coach/CoachDashboard'
import AdherentDashboard from './pages/adherent/AdherentDashboard'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import SuperAdminUsersPage from './pages/superadmin/SuperAdminUsersPage'
import SuperAdminClubsPage from './pages/superadmin/SuperAdminClubsPage'
import PlanningPage from './pages/PlanningPage'
import ProfilePage from './pages/ProfilePage'
import Layout from './components/layout/Layout'
import SubscriptionLocked from './pages/auth/SubscriptionLocked'

// Guard de route selon le rôle
function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-bg text-text transition-colors duration-300">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted">Chargement I-Gym...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  if (user.role === 'adherent' && user.subscription_status !== 'active') {
    return <SubscriptionLocked />
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

// Redirection intelligente après login ou affichage de la page d'accueil
function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Welcome />
  if (user.role === 'super_admin') return <Navigate to="/superadmin" replace />
  if (user.role === 'admin')    return <Navigate to="/admin" replace />
  if (user.role === 'coach')    return <Navigate to="/coach" replace />
  return <Navigate to="/adherent" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Root Welcome / Redirect */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Super Admin */}
      <Route path="/superadmin" element={
        <RoleRoute roles={['super_admin']}>
          <Layout><SuperAdminDashboard /></Layout>
        </RoleRoute>
      } />
      <Route path="/superadmin/users" element={
        <RoleRoute roles={['super_admin']}>
          <Layout><SuperAdminUsersPage /></Layout>
        </RoleRoute>
      } />
      <Route path="/superadmin/clubs" element={
        <RoleRoute roles={['super_admin']}>
          <Layout><SuperAdminClubsPage /></Layout>
        </RoleRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <RoleRoute roles={['admin']}>
          <Layout><AdminDashboard /></Layout>
        </RoleRoute>
      } />
      <Route path="/admin/gym" element={
        <RoleRoute roles={['admin']}>
          <Layout><AdminGymPage /></Layout>
        </RoleRoute>
      } />
      <Route path="/admin/courses" element={
        <RoleRoute roles={['admin']}>
          <Layout><AdminCoursesPage /></Layout>
        </RoleRoute>
      } />
      <Route path="/admin/members" element={
        <RoleRoute roles={['admin']}>
          <Layout><AdminMembersPage /></Layout>
        </RoleRoute>
      } />
      <Route path="/admin/coaches" element={
        <RoleRoute roles={['admin']}>
          <Layout><AdminCoachesPage /></Layout>
        </RoleRoute>
      } />
      <Route path="/admin/reservations" element={
        <RoleRoute roles={['admin']}>
          <Layout><AdminReservationsPage /></Layout>
        </RoleRoute>
      } />
      <Route path="/admin/subscriptions" element={
        <RoleRoute roles={['admin']}>
          <Layout><AdminSubscriptions /></Layout>
        </RoleRoute>
      } />

      {/* Coach */}
      <Route path="/coach" element={
        <RoleRoute roles={['coach', 'admin']}>
          <Layout><CoachDashboard /></Layout>
        </RoleRoute>
      } />

      {/* Adhérent */}
      <Route path="/adherent" element={
        <RoleRoute roles={['adherent', 'admin']}>
          <Layout><AdherentDashboard /></Layout>
        </RoleRoute>
      } />

      {/* Pages partagées */}
      <Route path="/planning" element={
        <RoleRoute roles={['adherent', 'coach', 'admin']}>
          <Layout><PlanningPage /></Layout>
        </RoleRoute>
      } />
      <Route path="/profile" element={
        <RoleRoute roles={['super_admin', 'admin', 'coach', 'adherent']}>
          <Layout><ProfilePage /></Layout>
        </RoleRoute>
      } />


      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

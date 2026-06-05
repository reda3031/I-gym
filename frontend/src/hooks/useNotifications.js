import { useState, useCallback } from 'react'
import { usePolling } from './usePolling'
import api from '../services/api'

/**
 * Hook notifications : polling toutes les 10 secondes
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch {}
  }, [])

  // Polling toutes les 3 secondes pour un effet temps réel instantané
  usePolling(fetchNotifications, 3000)

  const markRead = useCallback(async (id) => {
    await api.patch(`/notifications/${id}/read`)
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await api.patch('/notifications/read-all')
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, markRead, markAllRead, fetchNotifications }
}

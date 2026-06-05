import { useEffect, useRef } from 'react'

/**
 * Hook de polling générique avec setInterval
 * @param {Function} callback - Fonction à appeler périodiquement
 * @param {number}   interval - Intervalle en ms (null pour désactiver)
 */
export function usePolling(callback, interval) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!interval) return
    // Appel immédiat au montage
    savedCallback.current()
    const id = setInterval(() => savedCallback.current(), interval)
    return () => clearInterval(id)
  }, [interval])
}

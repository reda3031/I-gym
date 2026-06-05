import { useMemo } from 'react'

/** Couleurs Recharts lues depuis les variables CSS du thème actif */
export function useChartTheme() {
  return useMemo(() => ({
    grid: 'var(--chart-grid)',
    tick: 'var(--text-muted)',
    bar: 'var(--accent)',
    tooltip: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      color: 'var(--text)',
    },
    radialTrack: 'var(--chart-track)',
  }), [])
}

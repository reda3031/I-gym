import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'

/**
 * WOW Feature #2 — Jauge circulaire occupation salle
 */
export default function OccupancyGauge({ room }) {
  const chart = useChartTheme()
  const { name, capacity, current_count, occupancy_rate, status } = room

  const color = status === 'low' ? 'var(--accent)'
    : status === 'medium'        ? 'var(--warning)'
    : status === 'high'          ? 'var(--danger)'
    : 'var(--danger-light)'

  const bgColor = status === 'low' ? 'var(--accent-muted)'
    : status === 'medium'          ? 'var(--warning-muted)'
    : 'var(--danger-muted)'

  const statusLabel = status === 'low' ? '✅ Disponible'
    : status === 'medium'              ? '⚠️ Modéré'
    : status === 'high'                ? '🔴 Presque plein'
    : '🚫 Complet'

  const data = [{ value: occupancy_rate, fill: color }]

  return (
    <div
      className="glass-card rounded-2xl p-5 card-hover"
      style={{ borderColor: `${color}33` }}
    >
      {/* Jauge */}
      <div className="relative h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="55%" outerRadius="80%"
            startAngle={180} endAngle={0}
            data={data}
            barSize={12}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: chart.radialTrack }}
              dataKey="value"
              cornerRadius={6}
              className="gauge-circle"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Texte central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>
            {occupancy_rate}%
          </span>
          <span className="text-xs text-text-muted">{current_count}/{capacity}</span>
        </div>
      </div>

      {/* Info */}
      <div className="text-center mt-2">
        <h3 className="font-semibold text-text text-sm">{name}</h3>
        <span
          className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: bgColor, color }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Alerte si > 80% */}
      {occupancy_rate > 80 && (
        <div className="mt-3 px-3 py-2 surface-danger border border-danger-muted rounded-xl">
          <p className="text-xs text-danger font-medium text-center">
            ⚠️ {name} est presque pleine ({occupancy_rate}%)
          </p>
        </div>
      )}
    </div>
  )
}

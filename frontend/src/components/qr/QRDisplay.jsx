import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { CheckCircle, XCircle, Dumbbell, Clock } from 'lucide-react'

/**
 * WOW Feature #1 — QR Code dynamique avec animation Access Granted/Denied
 */
export default function QRDisplay({ user }) {
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState('granted') // 'granted' | 'denied'
  const [isCheckedIn, setIsCheckedIn]     = useState(false)

  // Déterminer couleur selon statut abonnement
  const subStatus = user?.subscription_status || 'expired'
  const qrColor = subStatus === 'active' ? 'var(--accent)'
    : subStatus === 'expiring_soon'      ? 'var(--warning)'
    : 'var(--danger)'

  const glowClass = subStatus === 'active' ? 'qr-glow-green'
    : subStatus === 'expiring_soon'         ? 'qr-glow-orange'
    : 'qr-glow-red'

  // Simuler un scan (pour la démo — en vrai c'est le POST /check-in)
  const simulateScan = (type) => {
    setAnimationType(type)
    setShowAnimation(true)
    if (type === 'granted') setIsCheckedIn(true)
    setTimeout(() => setShowAnimation(false), 2500)
  }

  // QR value : encode user_id + token + expiry
  const qrValue = JSON.stringify({
    user_id:    user?.id,
    token:      user?.qr_token,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  })

  return (
    <div className="relative">
      {/* Animation overlay plein écran */}
      {showAnimation && (
        <AccessAnimation
          type={animationType}
          userName={user?.name}
          onEnd={() => setShowAnimation(false)}
        />
      )}

      {/* Card QR */}
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            subStatus === 'active' ? 'bg-accent animate-pulse' :
            subStatus === 'expiring_soon' ? 'bg-warning animate-pulse' : 'bg-danger'
          }`} />
          <span className="text-sm font-medium text-text">
            {subStatus === 'active' ? '✅ Abonnement Actif'
             : subStatus === 'expiring_soon' ? '⚠️ Expire bientôt'
             : '❌ Abonnement Expiré'}
          </span>
        </div>

        {/* QR Code */}
        <div className={`p-4 bg-qr-surface rounded-2xl ${glowClass} transition-all duration-300`}>
          <QRCode
            value={qrValue}
            size={200}
            fgColor={qrColor}
            bgColor="var(--qr-surface)"
            level="M"
          />
        </div>

        {/* Badge séance */}
        {isCheckedIn ? (
          <div className="flex items-center gap-2 px-4 py-2 surface-accent border border-accent-muted rounded-full animate-pulse">
            <Dumbbell className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">🏋️ Séance en cours</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-bg-hover rounded-full">
            <Clock className="w-4 h-4 text-text-dim" />
            <span className="text-xs text-text-dim">Scan pour accéder à la salle</span>
          </div>
        )}

      </div>
    </div>
  )
}

function AccessAnimation({ type, userName, onEnd }) {
  useEffect(() => {
    const timer = setTimeout(onEnd, 2500)
    return () => clearTimeout(timer)
  }, [onEnd])

  const isGranted = type === 'granted'

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center access-overlay
      ${isGranted ? 'overlay-accent' : 'overlay-danger'}`}>
      <div className="text-center text-on-accent">
        {isGranted ? (
          <svg className="w-32 h-32 mx-auto mb-6" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="4" opacity="0.3" />
            <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="4"
              strokeDasharray="283" strokeDashoffset="0" className="gauge-circle" />
            <path d="M25 50 L42 67 L75 35" stroke="white" strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round" className="checkmark-path" />
          </svg>
        ) : (
          <XCircle className="w-32 h-32 mx-auto mb-6 animate-bounce-in" />
        )}
        <h2 className="text-4xl font-black mb-3">
          {isGranted ? '✅ Accès Accordé' : '❌ Accès Refusé'}
        </h2>
        <p className="text-xl font-medium opacity-90">
          {isGranted ? `Bienvenue ${userName} !` : 'Abonnement expiré'}
        </p>
        {isGranted && (
          <p className="mt-2 text-sm opacity-70">Bonne séance ! 💪</p>
        )}
      </div>
    </div>
  )
}

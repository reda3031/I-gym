import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/TranslationContext'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'
import { UserCircle, Save, Mail, Lock, Shield, Loader2, ArrowLeft, Phone, Activity, Camera, Upload, Check, Download, Printer } from 'lucide-react'
import QRCode from 'react-qr-code'
import { jsPDF } from 'jspdf'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    weight: '',
    height: '',
    gender: '',
    objective_type: '',
    language_preference: 'fr',
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')
  const [savePhotoLoading, setSavePhotoLoading] = useState(false)

  useEffect(() => {
    if (user?.avatar) {
      setAvatarPreview(user.avatar)
    }
  }, [user])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveBadgePhoto = async () => {
    setSavePhotoLoading(true)
    setSuccess('')
    setError('')
    try {
      await api.put('/user/profile', {
        ...formData,
        avatar: avatarPreview
      })
      setSuccess('Photo du badge enregistrée avec succès.')
      await refreshUser()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la photo.')
    } finally {
      setSavePhotoLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        age: user.age || '',
        weight: user.weight || '',
        height: user.height || '',
        gender: user.gender || '',
        objective_type: user.objective_type || '',
        language_preference: user.language_preference || 'fr'
      }))
    }
  }, [user])

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    setError('')
    try {
      await api.put('/user/profile', formData)
      setSuccess('Profil mis à jour avec succès.')
      await refreshUser()
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
      }))
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  const downloadBadge = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;  // High resolution for clear printing
    canvas.height = 920;
    const ctx = canvas.getContext('2d');

    const getAvatarBase64 = async () => {
      if (!user?.avatar) return null;
      try {
        const response = await api.get('/user/avatar', { responseType: 'blob' });
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(response.data);
        });
      } catch (e) {
        console.error("Failed to fetch authenticated avatar:", e);
        return null;
      }
    };

    // 1. Background gradient
    const grad = ctx.createLinearGradient(0, 0, 600, 920);
    grad.addColorStop(0, '#1e1b4b'); // Indigo dark
    grad.addColorStop(1, '#0f172a'); // Slate dark
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 920);

    // Decorative glow shapes
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.beginPath();
    ctx.arc(600, 0, 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.beginPath();
    ctx.arc(0, 920, 250, 0, Math.PI * 2);
    ctx.fill();

    // 2. Outer border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 8;
    ctx.strokeRect(15, 15, 570, 890);

    // 3. Header text
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('I-GYM CLUB', 50, 80);

    // Membre badge
    ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(430, 48, 120, 40, 8) : ctx.rect(430, 48, 120, 40);
    ctx.fill();
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEMBRE', 490, 73);

    // Line separator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 115);
    ctx.lineTo(550, 115);
    ctx.stroke();

    // 4. Load Avatar Photo
    const avatarImg = new Image();

    const drawDetailsAndQR = () => {
      // 5. User name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((formData.name || 'MEMBRE').toUpperCase(), 300, 450);

      // 6. Gym Name
      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText((user?.gym?.name ? `Club : ${user.gym.name}` : 'Club I-GYM').toUpperCase(), 300, 495);

      // 7. QR Code White Rounded Box
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(190, 540, 220, 220, 24) : ctx.rect(190, 540, 220, 220);
      ctx.fill();

      // Get QR code from SVG
      const svgEl = document.querySelector('#badge-qrcode-container svg');
      if (svgEl) {
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 200, 550, 200, 200);
          finishAndDownload();
        };
        qrImg.src = blobURL;
      } else {
        // Fallback text if QR not found
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('CODE D\'ACCÈS', 300, 650);
        finishAndDownload();
      }
    };

    const finishAndDownload = () => {
      // 8. Footer divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(50, 800);
      ctx.lineTo(550, 800);
      ctx.stroke();

      // 9. Footer ID and status
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('ID DE MEMBRE', 50, 835);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`#IG-${String(user?.id || '0000').padStart(4, '0')}`, 50, 865);

      // Access status badge
      const isAccessActive = user?.subscription_status === 'active';
      ctx.fillStyle = isAccessActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(380, 830, 170, 40, 20) : ctx.rect(380, 830, 170, 40);
      ctx.fill();

      ctx.fillStyle = isAccessActive ? '#10b981' : '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isAccessActive ? 'ACCÈS ACTIF' : 'ACCÈS BLOQUÉ', 465, 855);

      // Save canvas as PDF using jsPDF
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85.6, 139.7] // Vertical ID badge format (standard CR80 / aspect ratio)
      });
      doc.addImage(imgData, 'PNG', 0, 0, 85.6, 139.7);
      doc.save(`IGYM_Badge_${formData.name || 'Membre'}.pdf`);
    };

    avatarImg.onload = () => {
      // Draw avatar photo clipped in a circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(300, 260, 110, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, 190, 150, 220, 220);
      ctx.restore();

      // Avatar border circle
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(300, 260, 110, 0, Math.PI * 2);
      ctx.stroke();

      drawDetailsAndQR();
    };

    avatarImg.onerror = () => {
      // Fallback if avatar loading fails or is empty
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(300, 260, 110, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((formData.name || 'U')[0].toUpperCase(), 300, 280);

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(300, 260, 110, 0, Math.PI * 2);
      ctx.stroke();

      drawDetailsAndQR();
    };

    // Load photo or trigger error handler for initials fallback
    if (avatarPreview && avatarPreview.startsWith('data:image')) {
      avatarImg.src = avatarPreview;
    } else if (user?.avatar) {
      // Fetch authenticated avatar as base64 blob to bypass CORS/auth issues
      const base64Avatar = await getAvatarBase64();
      if (base64Avatar) {
        avatarImg.src = base64Avatar;
      } else {
        avatarImg.onerror();
      }
    } else {
      avatarImg.onerror();
    }
  };

  const navigate = useNavigate()
  const isAdherent = user?.role === 'adherent'

  // QR value : encode user_id + token
  const qrValue = JSON.stringify({
    user_id:    user?.id,
    token:      user?.qr_token,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-hover rounded-xl hover:bg-bg-card transition-colors">
          <ArrowLeft className="w-5 h-5 text-text" />
        </button>
        <UserCircle className="w-8 h-8 text-accent" />
        <h1 className="text-2xl font-bold text-text">{t('nav.profile')}</h1>
      </div>

      {success && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">{success}</div>}
      {error && <div className="p-4 bg-danger/10 text-danger rounded-xl border border-danger/20">{error}</div>}

      <div className={isAdherent ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" : "max-w-2xl mx-auto"}>
        {/* Formulaire de Profil */}
        <div className={`glass-card p-6 rounded-2xl ${isAdherent ? "lg:col-span-7" : ""}`}>
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">{user?.name}</h2>
              <p className="text-text-muted flex items-center gap-1 text-sm mt-1">
                <Shield className="w-3.5 h-3.5" /> Rôle : <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Nom Complet</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" required />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-dim mb-1 uppercase flex items-center gap-1"><Mail className="w-3.5 h-3.5"/> Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-dim mb-1 uppercase flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> Téléphone</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" />
              </div>
              {user?.role === 'adherent' && (
                <div>
                  <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Sexe</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="select-modern">
                    <option value="">Sélectionner</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                  </select>
                </div>
              )}
            </div>

            {user?.role === 'adherent' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Âge</label>
                    <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" min="10" max="100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Poids (kg)</label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" min="30" max="300" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Taille (cm)</label>
                    <input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" min="100" max="250" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-dim mb-1 uppercase flex items-center gap-1"><Activity className="w-3.5 h-3.5"/> Objectif Fitness</label>
                  <select name="objective_type" value={formData.objective_type} onChange={handleChange} className="select-modern">
                    <option value="">Sélectionner un objectif</option>
                    <option value="perte_de_poids">Perte de poids</option>
                    <option value="prise_de_masse">Prise de masse</option>
                    <option value="endurance">Endurance</option>
                    <option value="flexibilite">Flexibilité</option>
                  </select>
                </div>
              </>
            )}

            <div className="pt-4 mt-4 border-t border-border/50">
              <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Langue Préférée / Preferred Language</label>
              <select name="language_preference" value={formData.language_preference} onChange={handleChange} className="select-modern">
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
                <option value="ar">🇸🇦 العربية (Arabic)</option>
                <option value="es">🇪🇸 Español (Spanish)</option>
                <option value="de">🇩🇪 Deutsch (German)</option>
              </select>
            </div>

            <div className="pt-4 mt-4 border-t border-border/50">
              <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-warning"/> Changer le mot de passe (optionnel)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Mot de passe actuel</label>
                  <input type="password" name="current_password" value={formData.current_password} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Nouveau mot de passe</label>
                    <input type="password" name="new_password" value={formData.new_password} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-dim mb-1 uppercase">Confirmer mot de passe</label>
                    <input type="password" name="new_password_confirmation" value={formData.new_password_confirmation} onChange={handleChange} className="w-full px-4 py-2 bg-bg-input rounded-xl border border-border/50 text-text" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button type="submit" disabled={loading} className="w-full md:w-auto px-6 py-2.5 bg-accent text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? t('common.loading') : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>

        {/* Badge d'Accès Créator (pour adhérents) */}
        {isAdherent && (
          <div className="glass-card p-6 rounded-2xl lg:col-span-5 flex flex-col items-center gap-6">
            <div className="w-full text-center">
              <h2 className="text-xl font-bold text-text mb-1">Créer mon Badge d'accès</h2>
              <p className="text-xs text-text-muted">Votre carte de membre officielle pour entrer au club.</p>
            </div>

            {/* Real-time ID Card Badge */}
            <div 
              className="relative w-full max-w-[310px] h-[460px] rounded-[28px] overflow-hidden p-6 flex flex-col items-center justify-between border select-none transition-all duration-300 hover:shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.98))',
                borderColor: 'rgba(99, 102, 241, 0.35)',
                boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.15)',
              }}
            >
              {/* Background Decorative Shapes */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

              {/* Header of Badge */}
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center text-white font-black text-xs">
                    I
                  </div>
                  <span className="text-xs font-black tracking-widest text-white">I-GYM CLUB</span>
                </div>
                <span className="text-[10px] font-bold text-accent/80 tracking-widest bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                  MEMBRE
                </span>
              </div>

              {/* Avatar photo block */}
              <div className="relative mt-2 group">
                <input 
                  type="file" 
                  id="badge-avatar-input" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoChange}
                />
                <label 
                  htmlFor="badge-avatar-input"
                  className="block cursor-pointer relative"
                >
                  <div className="w-32 h-32 rounded-full overflow-hidden border-3 border-accent/70 hover:border-accent transition-all duration-300 relative group-hover:scale-105 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800/80 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                        <Camera className="w-8 h-8 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[9px] font-bold text-center px-3 opacity-60">Ajouter Photo</span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 rounded-full">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </label>
              </div>

              {/* User Details */}
              <div className="text-center w-full mt-2">
                <h3 className="text-base font-extrabold text-white tracking-wide uppercase truncate">
                  {formData.name || 'Votre Nom'}
                </h3>
                <p className="text-[11px] font-semibold text-accent mt-0.5 tracking-wider uppercase truncate">
                  {user?.gym?.name ? `Club : ${user.gym.name}` : 'Club I-GYM'}
                </p>
              </div>

              {/* QR Code Container */}
              <div id="badge-qrcode-container" className="bg-white p-2.5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.08)] mt-2">
                <QRCode 
                  value={qrValue} 
                  size={95}
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                  level="M"
                />
              </div>

              {/* Footer status pill */}
              <div className="w-full border-t border-white/5 pt-3 flex items-center justify-between mt-2">
                <div className="flex flex-col items-start">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400">ID de membre</span>
                  <span className="text-[10px] font-mono font-bold text-white">#IG-{user?.id || '0000'}</span>
                </div>
                <div className={`flex items-center gap-1.5 ${
                  user?.subscription_status === 'active' 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                } px-2.5 py-0.5 rounded-full`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    user?.subscription_status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`} />
                  <span className={`text-[9px] font-bold ${
                    user?.subscription_status === 'active' ? 'text-emerald-400' : 'text-red-400'
                  } tracking-wider`}>
                    {user?.subscription_status === 'active' ? 'ACCÈS ACTIF' : 'ACCÈS BLOQUÉ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="w-full max-w-[310px] flex flex-col gap-3">
              {avatarPreview && avatarPreview !== user?.avatar && (
                <button
                  onClick={handleSaveBadgePhoto}
                  disabled={savePhotoLoading}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-accent-hover text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg transition-all text-sm w-full"
                >
                  {savePhotoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer mon Badge
                </button>
              )}
              
              <button
                onClick={downloadBadge}
                className="flex items-center justify-center gap-2 bg-slate-800 text-white font-semibold py-2.5 px-5 rounded-xl border border-white/10 hover:bg-slate-700 transition-all text-sm w-full"
              >
                <Download className="w-4 h-4" />
                Télécharger le Badge (PDF / Imprimer)
              </button>
            </div>

            <p className="text-xs text-text-dim text-center italic max-w-[280px]">
              {user?.avatar 
                ? "💡 Votre badge est prêt ! Téléchargez-le au format PDF pour l'imprimer ou l'avoir sur votre téléphone." 
                : "💡 Ajoutez votre photo en cliquant sur le badge ci-dessus pour le valider."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

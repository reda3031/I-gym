import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";
import {
  Building2,
  Save,
  MapPin,
  Phone,
  Mail,
  Clock,
  ShieldAlert,
  Loader2,
  Info,
  Trash2,
} from "lucide-react";
import GymPhoto from "../../components/ui/GymPhoto";
import { readFileAsDataUrl } from "../../utils/imageUpload";

export default function AdminGymPage() {
  const { t } = useTranslation();
  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const defaultOpeningHours = {
    Lundi: { active: true, start: "06:00", end: "22:00" },
    Mardi: { active: true, start: "06:00", end: "22:00" },
    Mercredi: { active: true, start: "06:00", end: "22:00" },
    Jeudi: { active: true, start: "06:00", end: "22:00" },
    Vendredi: { active: true, start: "06:00", end: "22:00" },
    Samedi: { active: true, start: "08:00", end: "20:00" },
    Dimanche: { active: false, start: "09:00", end: "16:00" },
  };

  const getDayTranslation = (dayName) => {
    const mapping = {
      Lundi: "day.lun",
      Mardi: "day.mar",
      Mercredi: "day.mer",
      Jeudi: "day.jeu",
      Vendredi: "day.ven",
      Samedi: "day.sam",
      Dimanche: "day.dim",
    };
    const key = mapping[dayName];
    return key ? t(key) : dayName;
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(":").map(Number);
    return hrs * 60 + mins;
  };

  useEffect(() => {
    api
      .get("/admin/gym")
      .then(({ data }) => {
        // Guarantee opening_hours fallback
        if (
          !data.opening_hours ||
          typeof data.opening_hours !== "object" ||
          Object.keys(data.opening_hours).length === 0
        ) {
          data.opening_hours = defaultOpeningHours;
        }
        if (data.max_capacity === undefined || data.max_capacity === null) {
          data.max_capacity = 100;
        }
        if (!data.advantages) {
          data.advantages = [];
        } else if (typeof data.advantages === "string") {
          try {
            data.advantages = JSON.parse(data.advantages);
          } catch {
            data.advantages = [];
          }
        }
        setGym(data);
      })
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            t("admin.gym.errLoad") ||
            "Erreur lors du chargement des informations.",
        ),
      )
      .finally(() => setLoading(false));
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGym((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setGym((prev) => ({ ...prev, logo: dataUrl }));
      setError("");
    } catch (err) {
      setError(err.message || "Impossible de charger l'image sélectionnée.");
    }
  };

  const clearPhoto = () => {
    setGym((prev) => ({ ...prev, logo: "" }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    // Client-side validation: capacity
    if (parseInt(gym.max_capacity) <= 0) {
      setError(
        t("superadmin.dashboard.errCapacity") ||
          "La capacité maximale doit être supérieure à 0.",
      );
      setSaving(false);
      return;
    }

    // Client-side validation: email
    if (gym.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gym.email)) {
      setError(
        t("superadmin.dashboard.errEmailFormat") ||
          "Le format de l'e-mail du club est invalide.",
      );
      setSaving(false);
      return;
    }

    // Client-side validation: opening hours
    if (gym.opening_hours) {
      for (const [day, times] of Object.entries(gym.opening_hours)) {
        if (times.active) {
          if (!times.start || !times.end) {
            setError(
              t("superadmin.dashboard.errHoursMissing", {
                day: getDayTranslation(day),
              }) || `Les horaires pour le jour ${day} doivent être renseignés.`,
            );
            setSaving(false);
            return;
          }
          const startMin = timeToMinutes(times.start);
          const endMin = timeToMinutes(times.end);
          if (endMin <= startMin) {
            setError(
              t("superadmin.dashboard.errHoursSequence", {
                day: getDayTranslation(day),
              }) ||
                `L'heure de fermeture doit être après l'heure d'ouverture pour le jour ${day}.`,
            );
            setSaving(false);
            return;
          }
        }
      }
    }

    try {
      await api.put("/admin/gym", gym);
      setSuccess(
        t("admin.gym.saveSuccess") || "Informations mises à jour avec succès.",
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          t("admin.gym.errSave") ||
          "Erreur lors de la sauvegarde.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-text">
        <Loader2 className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mr-3" />
        <span className="text-sm font-semibold">{t("common.loading")}</span>
      </div>
    );

  if (error && !gym)
    return (
      <div className="text-center text-danger py-20 max-w-md mx-auto">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
        <p className="font-bold text-sm">{error}</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-text">
      {/* Header */}
      <div className="flex items-center gap-3 bg-bg-card/30 p-5 rounded-2xl border border-border/40 backdrop-blur-md">
        <Building2 className="w-6 h-6 text-accent" />
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">
            {gym.name || t("nav.gym")}
          </h1>
          <p className="text-text-muted text-xs font-semibold mt-0.5">
            {t("superadmin.clubs.subtitle") ||
              "Gestion globale et configuration de votre club sportif"}
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 text-xs font-bold">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-danger/10 text-danger rounded-xl border border-danger/20 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/40 bg-bg-card/20 px-6 py-2 gap-1 text-[11px] font-bold uppercase tracking-wider overflow-x-auto rounded-t-2xl">
        {[
          { id: "general", label: "📋 Général" },
          { id: "contact", label: "📍 Contact" },
          { id: "hours", label: "⏰ Horaires & Capacité" },
          { id: "pricing", label: "💳 Tarifs & Avantages" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-accent/15 text-accent border border-accent/25"
                : "text-text-dim hover:text-text hover:bg-bg-input/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSave}
        className="glass-card p-6 rounded-b-2xl border-t-0 space-y-6"
      >
        {/* Tab 1: General */}
        {activeTab === "general" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                  {t("admin.gym.nameLabel") || "Nom de la salle"}
                </label>
                <input
                  type="text"
                  name="name"
                  value={gym.name || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-bg-input rounded-xl border border-border/50 text-text text-xs focus:outline-none focus:border-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                  {t("admin.gym.logoLabel") || "Photo du Club (optionnelle)"}
                </label>
                <div className="rounded-2xl border border-border/40 bg-bg-card/20 p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <GymPhoto
                      src={gym.logo}
                      alt={gym.name || "Photo du club"}
                      className="w-16 h-16 rounded-2xl object-cover border border-border/40 shrink-0"
                      iconClassName="w-7 h-7"
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        onChange={handlePhotoChange}
                        className="block w-full text-xs text-text-dim file:mr-3 file:rounded-xl file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:opacity-90"
                      />
                      <p className="mt-2 text-[10px] text-text-muted">
                        Ajoutez une vraie photo du club si vous le souhaitez.
                        JPG, PNG, WEBP ou GIF.
                      </p>
                    </div>
                  </div>
                  {gym.logo && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="text-[10px] font-bold text-danger hover:underline"
                    >
                      Retirer la photo
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                {t("superadmin.dashboard.speciality") || "Spécialité"}
              </label>
              <input
                type="text"
                name="speciality"
                value={gym.speciality || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-input rounded-xl border border-border/50 text-text text-xs focus:outline-none focus:border-accent"
                placeholder="Yoga, Fitness & Cardio"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                {t("admin.gym.descLabel") || "Description"}
              </label>
              <textarea
                name="description"
                value={gym.description || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-input rounded-xl border border-border/50 text-text text-xs h-28 resize-none focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Contact */}
        {activeTab === "contact" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                <MapPin className="inline w-3 h-3 mr-1 text-accent" />{" "}
                {t("admin.gym.addressLabel") || "Adresse"}
              </label>
              <input
                type="text"
                name="address"
                value={gym.address || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-input rounded-xl border border-border/50 text-text text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                {t("admin.gym.cityLabel") || "Ville"}
              </label>
              <input
                type="text"
                name="city"
                value={gym.city || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-input rounded-xl border border-border/50 text-text text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                <Phone className="inline w-3 h-3 mr-1 text-accent" />{" "}
                {t("admin.gym.phoneLabel") || "Téléphone"}
              </label>
              <input
                type="text"
                name="phone"
                value={gym.phone || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-input rounded-xl border border-border/50 text-text text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                <Mail className="inline w-3 h-3 mr-1 text-accent" />{" "}
                {t("admin.gym.emailLabel") || "Email (contact)"}
              </label>
              <input
                type="email"
                name="email"
                value={gym.email || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-input rounded-xl border border-border/50 text-text text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Horaires & Capacité */}
        {activeTab === "hours" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                {t("superadmin.dashboard.maxCapacity") ||
                  "Capacité maximale du Club"}
              </label>
              <input
                type="number"
                name="max_capacity"
                required
                min="1"
                value={gym.max_capacity || 100}
                onChange={handleChange}
                className="w-full max-w-[200px] px-3 py-2 bg-bg-input rounded-xl border border-border/50 text-text text-xs focus:outline-none focus:border-accent font-semibold"
                placeholder="100"
              />
            </div>

            <div className="border-t border-border/30 pt-4">
              <h4 className="text-xs font-bold text-text mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-accent" />
                {t("superadmin.dashboard.openingHours") ||
                  "Horaires de la Salle"}
              </h4>
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {Object.entries(gym.opening_hours || {}).map(([day, times]) => (
                  <div
                    key={day}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/20 bg-bg-card/10"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`day-checkbox-${day}`}
                        checked={times.active}
                        onChange={(e) =>
                          setGym((prev) => {
                            const copy = { ...prev.opening_hours };
                            copy[day] = {
                              ...copy[day],
                              active: e.target.checked,
                            };
                            return { ...prev, opening_hours: copy };
                          })
                        }
                        className="checkbox-modern"
                      />
                      <label
                        htmlFor={`day-checkbox-${day}`}
                        className="text-xs font-bold text-text uppercase tracking-wider select-none cursor-pointer"
                      >
                        {getDayTranslation(day)}
                      </label>
                    </div>

                    {times.active ? (
                      <div className="flex items-center gap-2 animate-fade-in">
                        <input
                          type="time"
                          required={times.active}
                          value={times.start}
                          onChange={(e) =>
                            setGym((prev) => {
                              const copy = { ...prev.opening_hours };
                              copy[day] = {
                                ...copy[day],
                                start: e.target.value,
                              };
                              return { ...prev, opening_hours: copy };
                            })
                          }
                          className="px-2 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent"
                        />
                        <span className="text-text-dim text-xs">→</span>
                        <input
                          type="time"
                          required={times.active}
                          value={times.end}
                          onChange={(e) =>
                            setGym((prev) => {
                              const copy = { ...prev.opening_hours };
                              copy[day] = { ...copy[day], end: e.target.value };
                              return { ...prev, opening_hours: copy };
                            })
                          }
                          className="px-2 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-danger/80 bg-danger/10 px-2 py-1 rounded-md border border-danger/20">
                        {t("superadmin.dashboard.closed") || "Fermé"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Tarifs & Avantages */}
        {activeTab === "pricing" && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">
              Configuration des Tarifs & Avantages de l'Abonnement
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monthly price input */}
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                  Tarif Mensuel (Mensuel)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  name="price_monthly"
                  value={gym.price_monthly || 0}
                  onChange={(e) =>
                    setGym((prev) => ({
                      ...prev,
                      price_monthly: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                  placeholder="Ex: 300"
                />
              </div>

              {/* Yearly price input */}
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                  Tarif Annuel (Annuel)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  name="price_yearly"
                  value={gym.price_yearly || 0}
                  onChange={(e) =>
                    setGym((prev) => ({
                      ...prev,
                      price_yearly: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                  placeholder="Ex: 2500"
                />
              </div>

              {/* Currency selection */}
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                  Devise
                </label>
                <select
                  name="currency"
                  value={gym.currency || "DH"}
                  onChange={(e) =>
                    setGym((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                  className="select-modern"
                >
                  <option value="DH">DH / MAD</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Advantages section */}
            <div className="space-y-2 pt-2">
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider">
                Avantages inclus dans l'abonnement
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="new-admin-advantage-input"
                  placeholder="Ex: Accès 24/7, Espace Cardio inclus..."
                  className="flex-1 px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = e.target.value.trim();
                      if (val) {
                        setGym((prev) => ({
                          ...prev,
                          advantages: [...(prev.advantages || []), val],
                        }));
                        e.target.value = "";
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("new-admin-advantage-input");
                    const val = input.value.trim();
                    if (val) {
                      setGym((prev) => ({
                        ...prev,
                        advantages: [...(prev.advantages || []), val],
                      }));
                      input.value = "";
                    }
                  }}
                  className="btn-accent px-4 rounded-xl text-xs font-bold"
                >
                  Ajouter
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2">
                {(gym.advantages || []).map((adv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-bg-input/20 border border-border/40 rounded-xl"
                  >
                    <span className="text-xs text-text">{adv}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setGym((prev) => ({
                          ...prev,
                          advantages: (prev.advantages || []).filter(
                            (_, i) => i !== idx,
                          ),
                        }))
                      }
                      className="text-danger hover:bg-danger/10 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!gym.advantages || gym.advantages.length === 0) && (
                  <p className="text-[10px] text-text-dim italic">
                    Aucun avantage spécifié. Ajoutez des avantages pour vos futurs adhérents.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-text-muted font-semibold">
            <Info className="w-3.5 h-3.5 text-accent" />
            <span>
              Tous les changements s'appliquent immédiatement pour vos membres.
            </span>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-xs bg-accent hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-opacity"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t("common.save") || "Sauvegarder"}
          </button>
        </div>
      </form>
    </div>
  );
}

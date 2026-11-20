import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/TranslationContext";
import api from "../../services/api";
import GymPhoto from "../../components/ui/GymPhoto";
import { readFileAsDataUrl } from "../../utils/imageUpload";
import {
  Building2,
  Users,
  MapPin,
  Loader2,
  Dumbbell,
  ShieldAlert,
  Pencil,
  Plus,
  X,
  Save,
  UserCircle,
  Clock,
  UserPlus,
  Trash2,
  Check,
} from "lucide-react";

export default function SuperAdminClubsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

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
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Default values for opening hours
  const defaultOpeningHours = {
    Lundi: { active: true, start: "06:00", end: "22:00" },
    Mardi: { active: true, start: "06:00", end: "22:00" },
    Mercredi: { active: true, start: "06:00", end: "22:00" },
    Jeudi: { active: true, start: "06:00", end: "22:00" },
    Vendredi: { active: true, start: "06:00", end: "22:00" },
    Samedi: { active: true, start: "08:00", end: "20:00" },
    Dimanche: { active: false, start: "09:00", end: "16:00" },
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(":").map(Number);
    return hrs * 60 + mins;
  };

  // Gym management modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [allAdmins, setAllAdmins] = useState([]);
  const [allCoaches, setAllCoaches] = useState([]);
  const [newCoaches, setNewCoaches] = useState([]);

  // State for the inline new coach form
  const [showAddCoachForm, setShowAddCoachForm] = useState(false);
  const [newCoachForm, setNewCoachForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "password",
    bio: "",
    experience: 2,
    specialties: "",
  });

  const [modalForm, setModalForm] = useState({
    name: "",
    slug: "",
    logo: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    speciality: "",
    color: "indigo",
    max_capacity: 100,
    opening_hours: defaultOpeningHours,
    price_monthly: 300,
    price_yearly: 2500,
    currency: "DH",
    advantages: [],
    admin_ids: [],
    coach_ids: [],
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchGymsList = () => {
    setLoading(true);
    api
      .get("/super-admin/gyms")
      .then(({ data }) => {
        setGyms(data.gyms || []);
        setError("");
      })
      .catch((err) => {
        console.error(err);
        setError(t("error.server"));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGymsList();

    api
      .get("/super-admin/all-coaches")
      .then(({ data }) => {
        setAllAdmins(data.admins || []);
        setAllCoaches(data.coaches || []);
      })
      .catch((err) => {
        console.error("Error fetching staff:", err);
      });
  }, [t]);

  const openModal = (gym = null) => {
    setModalError("");
    setActiveTab("general");
    setNewCoaches([]);
    setShowAddCoachForm(false);
    setNewCoachForm({
      name: "",
      email: "",
      phone: "",
      password: "password",
      bio: "",
      experience: 2,
      specialties: "",
    });

    if (gym) {
      setSelectedGym(gym);
      setModalForm({
        name: gym.name || "",
        slug: gym.slug || "",
        logo: gym.logo || "",
        description: gym.description || "",
        address: gym.address || "",
        city: gym.city || "",
        phone: gym.phone || "",
        email: gym.email || "",
        speciality: gym.speciality || "",
        color: gym.color || "indigo",
        max_capacity: gym.max_capacity || 100,
        opening_hours: gym.opening_hours || defaultOpeningHours,
        price_monthly: gym.price_monthly || 0,
        price_yearly: gym.price_yearly || 0,
        currency: gym.currency || "DH",
        advantages: Array.isArray(gym.advantages) ? gym.advantages : (gym.advantages ? JSON.parse(gym.advantages) : []),
        admin_ids: gym.admin_ids || [],
        coach_ids: gym.coach_ids || [],
        admin_name: "",
        admin_email: "",
        admin_password: "",
      });
    } else {
      setSelectedGym(null);
      setModalForm({
        name: "",
        slug: "",
        logo: "",
        description: "",
        address: "",
        city: "",
        phone: "",
        email: "",
        speciality: "",
        color: "indigo",
        max_capacity: 100,
        opening_hours: defaultOpeningHours,
        price_monthly: 300,
        price_yearly: 2500,
        currency: "DH",
        advantages: [],
        admin_ids: [],
        coach_ids: [],
        admin_name: "",
        admin_email: "",
        admin_password: "",
      });
    }
    setModalOpen(true);
  };

  const handleModalPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setModalForm((prev) => ({ ...prev, logo: dataUrl }));
      setModalError("");
    } catch (err) {
      setModalError(
        err.message || "Impossible de charger l'image sélectionnée.",
      );
    }
  };

  const clearModalPhoto = () => {
    setModalForm((prev) => ({ ...prev, logo: "" }));
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();

    // Valider la capacité maximale
    if (parseInt(modalForm.max_capacity) <= 0) {
      setModalError(
        t("superadmin.dashboard.errCapacity") ||
          "La capacité maximale doit être supérieure à 0.",
      );
      return;
    }

    // Valider le format de l'e-mail du club (s'il est fourni)
    if (
      modalForm.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modalForm.email)
    ) {
      setModalError(
        t("superadmin.dashboard.errEmailFormat") ||
          "Le format de l'e-mail du club est invalide.",
      );
      return;
    }

    // Valider les horaires d'ouverture
    for (const [day, times] of Object.entries(modalForm.opening_hours)) {
      if (times.active) {
        if (!times.start || !times.end) {
          setModalError(
            t("superadmin.dashboard.errHoursMissing", {
              day: getDayTranslation(day),
            }) || `Les horaires pour le jour ${day} doivent être renseignés.`,
          );
          return;
        }
        const startMin = timeToMinutes(times.start);
        const endMin = timeToMinutes(times.end);
        if (endMin <= startMin) {
          setModalError(
            t("superadmin.dashboard.errHoursSequence", {
              day: getDayTranslation(day),
            }) ||
              `L'heure de fermeture doit être après l'heure d'ouverture pour le jour ${day}.`,
          );
          return;
        }
      }
    }

    setSaving(true);
    setModalError("");
    try {
      const payload = {
        ...modalForm,
        new_coaches: newCoaches,
      };
      if (selectedGym) {
        await api.put(`/super-admin/gyms/${selectedGym.id}`, payload);
      } else {
        await api.post("/super-admin/gyms", payload);
      }

      // Refresh the page data
      fetchGymsList();

      // Re-fetch staff in case we created new ones
      const { data: staffData } = await api.get("/super-admin/all-coaches");
      setAllAdmins(staffData.admins || []);
      setAllCoaches(staffData.coaches || []);

      setModalOpen(false);
    } catch (err) {
      setModalError(
        err.response?.data?.message ||
          t("admin.gym.errSave") ||
          "Erreur lors de la sauvegarde.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && gyms.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-text">
        <div className="text-center">
          <Loader2 className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-card rounded-2xl border border-danger-muted text-center text-text">
        <ShieldAlert className="w-12 h-12 text-danger mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">{t("common.error")}</h3>
        <p className="text-text-muted text-sm mb-4">{error}</p>
        <button
          onClick={() => fetchGymsList()}
          className="btn-accent rounded-xl px-4 py-2 text-sm"
        >
          {t("common.retry") || "Réessayer"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-card/30 p-5 rounded-2xl border border-border/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-black text-text uppercase tracking-tight">
              {t("nav.gyms") || "Nos Clubs"}
            </h1>
          </div>
          <p className="text-text-muted text-xs font-semibold mt-1">
            {t("superadmin.clubs.subtitle") ||
              "Gestion globale et configuration de vos clubs sportifs"}
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 text-xs font-bold bg-accent text-white rounded-xl hover:opacity-90 flex items-center gap-1.5 shadow-md transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t("superadmin.dashboard.addClub") || "Ajouter un Club"}
        </button>
      </div>

      {/* Gym List Table */}
      <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/40 bg-bg-card/20">
          <h3 className="font-bold text-text text-xs uppercase tracking-wide flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            {t("superadmin.dashboard.clubsList") || "Liste Détaillée des Clubs"}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-bg-input/30 text-text-dim font-bold uppercase tracking-wider border-b border-border/30">
                <th className="py-4 px-6">
                  {t("superadmin.dashboard.thClubLogo") || "Club / Logo"}
                </th>
                <th className="py-4 px-6">
                  {t("superadmin.dashboard.thAddressCity") || "Adresse & Ville"}
                </th>
                <th className="py-4 px-6">
                  {t("superadmin.dashboard.thSpeciality") || "Spécialité"}
                </th>
                <th className="py-4 px-6 text-center">
                  {t("superadmin.dashboard.thMembers") || "Membres"}
                </th>
                <th className="py-4 px-6 text-center">
                  {t("superadmin.dashboard.thCoaches") || "Coachs"}
                </th>
                <th className="py-4 px-6 text-center">
                  {t("superadmin.dashboard.thPresent") || "Présents"}
                </th>
                <th className="py-4 px-6 text-center">
                  {t("superadmin.dashboard.thCourses") || "Cours (Auj.)"}
                </th>
                <th className="py-4 px-6 text-center">
                  {t("common.actions") || "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-medium">
              {gyms.map((gym) => (
                <tr
                  key={gym.id}
                  className="hover:bg-bg-input/20 transition-colors duration-300"
                >
                  <td
                    className="py-4 px-6 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() =>
                      navigate(
                        `/superadmin/users?role=adherent&gym_id=${gym.id}`,
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <GymPhoto
                        src={gym.logo}
                        alt={gym.name}
                        className="w-10 h-10 rounded-xl object-cover border border-border/30"
                        iconClassName="w-4 h-4"
                      />
                      <div>
                        <p className="font-bold text-text text-sm hover:underline">
                          {gym.name}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {gym.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-text">{gym.address}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-text-dim" />
                      {gym.city}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${gym.color}-500/10 text-${gym.color}-500 border border-${gym.color}-500/20`}
                    >
                      {gym.speciality}
                    </span>
                  </td>
                  <td
                    className="py-4 px-6 text-center font-bold text-text text-sm cursor-pointer hover:text-accent hover:underline transition-colors"
                    onClick={() =>
                      navigate(
                        `/superadmin/users?role=adherent&gym_id=${gym.id}`,
                      )
                    }
                  >
                    {gym.total_members}
                  </td>
                  <td
                    className="py-4 px-6 text-center text-text-muted cursor-pointer hover:text-accent hover:underline transition-colors"
                    onClick={() =>
                      navigate(`/superadmin/users?role=coach&gym_id=${gym.id}`)
                    }
                  >
                    {gym.total_coaches}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        gym.active_now > 0
                          ? "bg-orange-500/10 text-orange-500"
                          : "bg-bg-input text-text-dim"
                      }`}
                    >
                      {gym.active_now}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-accent text-sm">
                    {gym.courses_today}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => openModal(gym)}
                      title={
                        t("superadmin.dashboard.editClub") || "Modifier le Club"
                      }
                      className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/25 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gym Creation / Editing Modal */}
      {modalOpen &&
        createPortal(
          <div
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-[4px]"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-[95%] sm:w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border/60 overflow-hidden shadow-2xl animate-fade-in text-text"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-bg-card/30">
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-accent" />
                  {selectedGym
                    ? t("superadmin.dashboard.editClub") || "Modifier le Club"
                    : t("superadmin.dashboard.addNewClub") ||
                      "Ajouter un Nouveau Club"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-bg-input/50 text-text-dim hover:text-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-border/40 bg-bg-card/20 px-6 py-2 gap-1 text-[11px] font-bold uppercase tracking-wider overflow-x-auto">
                {[
                  { id: "general", label: t("superadmin.clubs.tabGeneral") || "📋 Général" },
                  { id: "hours", label: t("superadmin.clubs.tabHours") || "⏰ Horaires & Capacité" },
                  { id: "pricing", label: t("superadmin.clubs.tabPricing") || "💳 Tarifs & Avantages" },
                  { id: "staff", label: t("superadmin.clubs.tabStaff") || "🏋️ Staff" },
                  { id: "activities", label: t("superadmin.clubs.tabActivities") || "🏷️ Activités" },
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

              {/* Modal Form */}
              <form onSubmit={handleModalSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                  {modalError && (
                    <div className="p-3 bg-danger/10 text-danger rounded-xl border border-danger/20 text-xs font-semibold">
                      {modalError}
                    </div>
                  )}

                {activeTab === "general" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="rounded-2xl border border-border/30 bg-bg-input/20 p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <GymPhoto
                          src={modalForm.logo}
                          alt={modalForm.name || "Photo du club"}
                          className="w-24 h-24 rounded-2xl object-cover border border-border/40 shrink-0"
                          iconClassName="w-8 h-8"
                        />
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                              {t("superadmin.dashboard.logoUrl") ||
                                "Photo du Club (optionnelle)"}
                            </label>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                              onChange={handleModalPhotoChange}
                              className="block w-full text-xs text-text-dim file:mr-3 file:rounded-xl file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:opacity-90"
                            />
                            <p className="mt-2 text-[10px] text-text-muted">
                              {t("superadmin.clubs.photoUploadHelp") ||
                                "Ajoutez une vraie photo du club si vous le souhaitez. Vous pouvez aussi laisser ce champ vide."}
                            </p>
                          </div>
                          {modalForm.logo && (
                            <button
                              type="button"
                              onClick={clearModalPhoto}
                              className="text-[10px] font-bold text-danger hover:underline"
                            >
                              {t("superadmin.clubs.removePhoto") || "Retirer la photo"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("superadmin.dashboard.clubName") || "Nom du club"}
                        </label>
                        <input
                          type="text"
                          required
                          value={modalForm.name}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          placeholder="I-Gym Casablanca"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("superadmin.dashboard.slug") || "Slug (URL)"}
                        </label>
                        <input
                          type="text"
                          required
                          value={modalForm.slug}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              slug: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          placeholder="igym-casablanca"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("admin.gym.addressLabel") || "Adresse"}
                        </label>
                        <input
                          type="text"
                          required
                          value={modalForm.address}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          placeholder={t("superadmin.clubs.addressPlaceholder") || "Boulevard Ghandi"}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("admin.gym.cityLabel") || "Ville"}
                        </label>
                        <input
                          type="text"
                          required
                          value={modalForm.city}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          placeholder={t("superadmin.clubs.cityPlaceholder") || "Casablanca"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("admin.gym.phoneLabel") || "Téléphone"}
                        </label>
                        <input
                          type="text"
                          required
                          value={modalForm.phone}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          placeholder="+212600000000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("admin.gym.emailLabel") || "Email (contact)"}
                        </label>
                        <input
                          type="email"
                          value={modalForm.email}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          placeholder="contact@club.ma"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("superadmin.dashboard.descOptional") ||
                            "Description (Optionnelle)"}
                        </label>
                        <textarea
                          value={modalForm.description}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          className="w-full h-28 px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent resize-none"
                          placeholder={
                            t("superadmin.dashboard.descPlaceholder") ||
                            "Description rapide du club..."
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("superadmin.dashboard.colorTheme") ||
                            "Couleur Thématique"}
                        </label>
                        <select
                          value={modalForm.color}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              color: e.target.value,
                            }))
                          }
                          className="select-modern"
                        >
                          <option value="indigo">Indigo</option>
                          <option value="orange">Orange</option>
                          <option value="emerald">Emerald</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-border/30 pt-4 space-y-3">
                      <h4 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                        <UserCircle className="w-4 h-4 text-accent" />
                        {t("superadmin.dashboard.createAdminOptional") ||
                          "Créer le Compte Administrateur Principal (Optionnel)"}
                      </h4>
                      <div className="p-4 rounded-xl border border-border/30 bg-bg-input/20 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                              {t("profile.fullName") || "Nom Complet"}
                            </label>
                            <input
                              type="text"
                              value={modalForm.admin_name}
                              onChange={(e) =>
                                setModalForm((prev) => ({
                                  ...prev,
                                  admin_name: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                              placeholder={t("superadmin.clubs.adminPlaceholder") || "Ex: Jean Dupont"}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                              {t("profile.email") || "Adresse E-mail"}
                            </label>
                            <input
                              type="email"
                              value={modalForm.admin_email}
                              onChange={(e) =>
                                setModalForm((prev) => ({
                                  ...prev,
                                  admin_email: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                              placeholder="admin@club.ma"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                            {t("profile.password") || "Mot de Passe"}
                          </label>
                          <input
                            type="password"
                            value={modalForm.admin_password}
                            onChange={(e) =>
                              setModalForm((prev) => ({
                                ...prev,
                                admin_password: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                            placeholder={t("superadmin.clubs.passwordHelp") || "•••••• (min 6 caractères)"}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Horaires & Capacité */}
                {activeTab === "hours" && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                        {t("superadmin.dashboard.maxCapacity") ||
                          "Capacité maximale du Club"}
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={modalForm.max_capacity}
                        onChange={(e) =>
                          setModalForm((prev) => ({
                            ...prev,
                            max_capacity: e.target.value,
                          }))
                        }
                        className="w-full max-w-[200px] px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent font-semibold"
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
                        {Object.entries(modalForm.opening_hours).map(
                          ([day, times]) => (
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
                                    setModalForm((prev) => {
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
                                      setModalForm((prev) => {
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
                                  <span className="text-text-dim text-xs">
                                    →
                                  </span>
                                  <input
                                    type="time"
                                    required={times.active}
                                    value={times.end}
                                    onChange={(e) =>
                                      setModalForm((prev) => {
                                        const copy = { ...prev.opening_hours };
                                        copy[day] = {
                                          ...copy[day],
                                          end: e.target.value,
                                        };
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
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Staff (Admins & Coachs) */}
                {activeTab === "staff" && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <UserCircle className="w-4 h-4 text-accent" />
                        {t("superadmin.dashboard.assignAdmins") ||
                          "Assigner des Administrateurs existants"}
                      </h4>
                      <div className="max-h-[140px] overflow-y-auto border border-border/30 rounded-xl bg-bg-input/20 p-2.5 space-y-1.5">
                        {allAdmins.length === 0 ? (
                          <div className="text-center text-xs text-text-dim py-4">
                            {t("common.noData")}
                          </div>
                        ) : (
                          allAdmins.map((adm) => {
                            const isChecked = modalForm.admin_ids.includes(
                              adm.id,
                            );
                            return (
                              <label
                                key={adm.id}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-input/50 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) =>
                                      setModalForm((prev) => {
                                        const newIds = e.target.checked
                                          ? [...prev.admin_ids, adm.id]
                                          : prev.admin_ids.filter(
                                              (id) => id !== adm.id,
                                            );
                                        return { ...prev, admin_ids: newIds };
                                      })
                                    }
                                    className="checkbox-modern"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-text">
                                      {adm.name}
                                    </span>
                                    <span className="text-[10px] text-text-dim">
                                      {adm.email}
                                    </span>
                                  </div>
                                </div>
                                {adm.gym_id &&
                                  adm.gym_id !== selectedGym?.id && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                      {t("superadmin.dashboard.otherClub") ||
                                        "Autre club"}
                                    </span>
                                  )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border/30 pt-4">
                      <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-accent" />
                        {t("superadmin.dashboard.assignCoaches") ||
                          "Assigner des Coachs existants"}
                      </h4>
                      <div className="max-h-[140px] overflow-y-auto border border-border/30 rounded-xl bg-bg-input/20 p-2.5 space-y-1.5 mb-3">
                        {allCoaches.length === 0 ? (
                          <div className="text-center text-xs text-text-dim py-4">
                            {t("common.noData")}
                          </div>
                        ) : (
                          allCoaches.map((co) => {
                            const isChecked = modalForm.coach_ids.includes(
                              co.id,
                            );
                            return (
                              <label
                                key={co.id}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-input/50 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) =>
                                      setModalForm((prev) => {
                                        const newIds = e.target.checked
                                          ? [...prev.coach_ids, co.id]
                                          : prev.coach_ids.filter(
                                              (id) => id !== co.id,
                                            );
                                        return { ...prev, coach_ids: newIds };
                                      })
                                    }
                                    className="checkbox-modern"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-text">
                                      {co.name}
                                    </span>
                                    <span className="text-[10px] text-text-dim">
                                      {co.email}
                                    </span>
                                  </div>
                                </div>
                                {co.gym_id && co.gym_id !== selectedGym?.id && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    {t("superadmin.dashboard.otherClub") ||
                                      "Autre club"}
                                  </span>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Inline Coach Creation */}
                    <div className="border-t border-border/30 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-accent" />
                          {t("superadmin.dashboard.newCoaches") ||
                            "Créer de nouveaux Coachs"}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowAddCoachForm(!showAddCoachForm)}
                          className="text-xs font-bold bg-accent/20 text-accent hover:bg-accent/35 border border-accent/25 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {showAddCoachForm
                            ? t("common.cancel")
                            : t("superadmin.dashboard.addCoachBtn") ||
                              "+ Ajouter un Coach"}
                        </button>
                      </div>

                      {showAddCoachForm && (
                        <div className="p-3 bg-bg-card/30 rounded-xl border border-border/40 space-y-3 mb-3 animate-fade-in">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">
                                {t("superadmin.dashboard.coachName") ||
                                  "Nom du Coach"}
                              </label>
                              <input
                                type="text"
                                value={newCoachForm.name}
                                onChange={(e) =>
                                  setNewCoachForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent"
                                placeholder="Karim Benslimane"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">
                                {t("profile.email") || "E-mail"}
                              </label>
                              <input
                                type="email"
                                value={newCoachForm.email}
                                onChange={(e) =>
                                  setNewCoachForm((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent"
                                placeholder="karim@igym.ma"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">
                                {t("admin.gym.phoneLabel") || "Téléphone"}
                              </label>
                              <input
                                type="text"
                                value={newCoachForm.phone}
                                onChange={(e) =>
                                  setNewCoachForm((prev) => ({
                                    ...prev,
                                    phone: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent"
                                placeholder="+212600000000"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">
                                {t("profile.password") || "Mot de passe"}
                              </label>
                              <input
                                type="password"
                                value={newCoachForm.password}
                                onChange={(e) =>
                                  setNewCoachForm((prev) => ({
                                    ...prev,
                                    password: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">
                                {t("superadmin.dashboard.experience") ||
                                  "Expérience (ans)"}
                              </label>
                              <input
                                type="number"
                                value={newCoachForm.experience}
                                onChange={(e) =>
                                  setNewCoachForm((prev) => ({
                                    ...prev,
                                    experience: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent"
                                placeholder="5"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">
                                {t("superadmin.dashboard.specialtiesComma") ||
                                  "Spécialités (séparées par virgules)"}
                              </label>
                              <input
                                type="text"
                                value={newCoachForm.specialties}
                                onChange={(e) =>
                                  setNewCoachForm((prev) => ({
                                    ...prev,
                                    specialties: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent"
                                placeholder="Crossfit, HIIT"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">
                              {t("superadmin.dashboard.bioOptional") ||
                                "Bio (Facultatif)"}
                            </label>
                            <textarea
                              value={newCoachForm.bio}
                              onChange={(e) =>
                                setNewCoachForm((prev) => ({
                                  ...prev,
                                  bio: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 bg-bg-input border border-border/50 text-text text-xs rounded-lg focus:outline-none focus:border-accent h-12 resize-none"
                              placeholder={
                                t("superadmin.dashboard.bioPlaceholder") ||
                                "Courte description du coach..."
                              }
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newCoachForm.name || !newCoachForm.email) {
                                  alert(
                                    t(
                                      "superadmin.dashboard.alertNameEmailRequired",
                                    ) ||
                                      "Veuillez renseigner le nom et l'e-mail du coach.",
                                  );
                                  return;
                                }
                                setNewCoaches((prev) => [
                                  ...prev,
                                  newCoachForm,
                                ]);
                                setNewCoachForm({
                                  name: "",
                                  email: "",
                                  phone: "",
                                  password: "password",
                                  bio: "",
                                  experience: 2,
                                  specialties: "",
                                });
                                setShowAddCoachForm(false);
                              }}
                              className="text-xs font-bold bg-accent text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                            >
                              {t("superadmin.dashboard.validateCoach") ||
                                "Valider le coach"}
                            </button>
                          </div>
                        </div>
                      )}

                      {newCoaches.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider">
                            {t("superadmin.dashboard.coachesToCreate") ||
                              "Coachs à créer à la sauvegarde :"}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {newCoaches.map((nc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-bg-input/20 border border-border/30 text-xs"
                              >
                                <div className="flex flex-col truncate">
                                  <span className="font-semibold text-text truncate">
                                    {nc.name}
                                  </span>
                                  <span className="text-[10px] text-text-dim truncate">
                                    {nc.email}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNewCoaches((prev) =>
                                      prev.filter((_, i) => i !== idx),
                                    )
                                  }
                                  className="p-1 hover:bg-danger/25 text-danger/80 hover:text-danger rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 4: Activités */}
                {activeTab === "activities" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">
                      {t("superadmin.dashboard.selectActivities") ||
                        "Domaines d'activités du Club"}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        "Crossfit",
                        "Yoga",
                        "Cardio",
                        "Musculation",
                        "Boxing",
                        "HIIT",
                      ].map((spec) => {
                        const currentSpecs = modalForm.speciality
                          ? modalForm.speciality
                              .split(",")
                              .map((s) => s.trim().toLowerCase())
                          : [];
                        const isActive = currentSpecs.includes(
                          spec.toLowerCase(),
                        );

                        const handleSpecialtyChange = (specName, checked) => {
                          let list = modalForm.speciality
                            ? modalForm.speciality
                                .split(",")
                                .map((s) => s.trim())
                            : [];

                          if (checked) {
                            if (
                              !list.some(
                                (s) =>
                                  s.toLowerCase() === specName.toLowerCase(),
                              )
                            ) {
                              list.push(specName);
                            }
                          } else {
                            list = list.filter(
                              (s) => s.toLowerCase() !== specName.toLowerCase(),
                            );
                          }

                          setModalForm((prev) => ({
                            ...prev,
                            speciality: list.join(", "),
                          }));
                        };

                        return (
                          <label
                            key={spec}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                              isActive
                                ? "bg-accent/10 border-accent/50 text-accent font-semibold shadow-inner"
                                : "bg-bg-input/20 border-border/30 hover:bg-bg-input/40 text-text"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(e) =>
                                handleSpecialtyChange(spec, e.target.checked)
                              }
                              className="checkbox-modern"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs">{spec}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <div className="pt-2">
                      <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                        {t("superadmin.dashboard.specialityDetails") ||
                          "Valeur finale de la spécialité"}
                      </label>
                      <input
                        type="text"
                        required
                        value={modalForm.speciality}
                        onChange={(e) =>
                          setModalForm((prev) => ({
                            ...prev,
                            speciality: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                        placeholder={t("superadmin.clubs.specialityPlaceholder") || "Crossfit & Fitness"}
                      />
                    </div>
                  </div>
                )}

                {/* Tab 5: Abonnements & Tarifs */}
                {activeTab === "pricing" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">
                      {t("superadmin.clubs.pricingTitle") || "Gestion des Tarifs et Avantages du Club"}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Prix Mensuel */}
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("superadmin.clubs.priceMonthly") || "Prix Mensuel"}
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={modalForm.price_monthly}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              price_monthly: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2.5 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          placeholder="Ex: 300"
                        />
                      </div>

                      {/* Prix Annuel */}
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("superadmin.clubs.priceYearly") || "Prix Annuel"}
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={modalForm.price_yearly}
                          onChange={(e) =>
                            setModalForm((prev) => ({
                              ...prev,
                              price_yearly: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2.5 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          placeholder="Ex: 2500"
                        />
                      </div>

                      {/* Devise */}
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                          {t("superadmin.clubs.currency") || "Devise"}
                        </label>
                        <select
                          value={modalForm.currency}
                          onChange={(e) =>
                            setModalForm((prev) => ({
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

                    {/* Avantages list */}
                    <div className="space-y-2 pt-2">
                      <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider">
                        {t("superadmin.clubs.advantagesTitle") || "Avantages inclus dans l'abonnement"}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="new-advantage-input"
                          placeholder={t("superadmin.clubs.advantagesPlaceholder") || "Ex: Accès illimité 24/7"}
                          className="flex-1 px-3 py-2 bg-bg-input border border-border/50 text-text text-xs rounded-xl focus:outline-none focus:border-accent"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = e.target.value.trim();
                              if (val) {
                                setModalForm((prev) => ({
                                  ...prev,
                                  advantages: [...prev.advantages, val],
                                }));
                                e.target.value = "";
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById("new-advantage-input");
                            const val = input.value.trim();
                            if (val) {
                              setModalForm((prev) => ({
                                ...prev,
                                advantages: [...prev.advantages, val],
                              }));
                              input.value = "";
                            }
                          }}
                          className="btn-accent px-4 rounded-xl text-xs font-bold"
                        >
                          {t("superadmin.clubs.addAdvantageBtn") || "Ajouter"}
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto pt-2">
                        {modalForm.advantages.map((adv, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-bg-input/20 border border-border/40 rounded-xl"
                          >
                            <span className="text-xs text-text">{adv}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setModalForm((prev) => ({
                                  ...prev,
                                  advantages: prev.advantages.filter(
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
                        {modalForm.advantages.length === 0 && (
                          <p className="text-[10px] text-text-dim italic">
                            {t("superadmin.clubs.noAdvantages") || "Aucun avantage spécifié. Ajoutez-en un ci-dessus."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                </div>

                {/* Form Footer Actions */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40 bg-bg-card/20 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold bg-bg-input hover:bg-bg-input/80 border border-border/30 rounded-xl transition-colors"
                  >
                    {t("common.cancel") || "Annuler"}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold bg-accent text-white rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-opacity"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {t("common.save") || "Sauvegarder"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

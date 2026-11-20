import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Users,
  Activity,
  Clock,
  Dumbbell,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import api from "../services/api";
import { useTranslation } from "../context/TranslationContext";
import GymPhoto from "../components/ui/GymPhoto";

export default function GymsPage({ onSelectGym, selectedGymId }) {
  const { t } = useTranslation();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSpecialty, setActiveSpecialty] = useState("all");

  useEffect(() => {
    api
      .get("/gyms")
      .then(({ data }) => {
        setGyms(data);
      })
      .catch((err) => {
        console.error(err);
        setError(t("error.server"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [t]);

  // Extract all unique specialties
  const specialties = [
    "all",
    ...new Set(gyms.map((g) => g.speciality).filter(Boolean)),
  ];

  const filteredGyms = gyms.filter((gym) => {
    const matchesSearch =
      gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.speciality?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSpecialty =
      activeSpecialty === "all" || gym.speciality === activeSpecialty;

    return matchesSearch && matchesSpecialty;
  });

  // Theme helper mapping Gym colors to CSS classes
  const getThemeClasses = (color) => {
    switch (color) {
      case "orange":
        return {
          border: "hover:border-orange-500/50 selected:border-orange-500",
          text: "text-orange-500",
          bg: "bg-orange-500/10",
          shadow: "hover:shadow-orange-500/10",
          btn: "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20",
        };
      case "emerald":
        return {
          border: "hover:border-emerald-500/50 selected:border-emerald-500",
          text: "text-emerald-500",
          bg: "bg-emerald-500/10",
          shadow: "hover:shadow-emerald-500/10",
          btn: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20",
        };
      case "indigo":
      default:
        return {
          border: "hover:border-indigo-500/50 selected:border-indigo-500",
          text: "text-indigo-500",
          bg: "bg-indigo-500/10",
          shadow: "hover:shadow-indigo-500/10",
          btn: "bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-transparent text-text">
        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
        <p className="text-text-muted text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-card rounded-2xl border border-danger-muted text-center">
        <ShieldAlert className="w-12 h-12 text-danger mx-auto mb-4" />
        <h3 className="text-lg font-bold text-text mb-2">
          {t("common.error")}
        </h3>
        <p className="text-text-muted text-sm mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-text tracking-tight sm:text-3xl">
          {t("gym.selectTitle") || "Choisissez votre club"}
        </h2>
        <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
          {t("gym.selectSubtitle") ||
            "Veuillez sélectionner votre salle de sport avant de continuer"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-bg-card/30 p-4 rounded-2xl border border-border/40 backdrop-blur-md">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              t("gym.searchPlaceholder") || "Rechercher une salle, une ville..."
            }
            className="input-dark w-full rounded-xl pl-10 pr-4 py-2.5 text-sm bg-bg-input"
          />
        </div>

        {/* Filter tags */}
        <div className="flex flex-wrap gap-2 justify-center w-full sm:w-auto">
          {specialties.map((spec) => (
            <button
              key={spec}
              onClick={() => setActiveSpecialty(spec)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                activeSpecialty === spec
                  ? "bg-accent text-on-accent shadow-sm"
                  : "bg-bg-input/60 text-text-muted hover:text-text hover:bg-bg-input border border-border/40"
              }`}
            >
              {spec === "all" ? t("planning.all") || "Tous" : spec}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Gyms */}
      {filteredGyms.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-2xl border border-border/50">
          <Dumbbell className="w-12 h-12 text-text-dim mx-auto mb-3 animate-pulse" />
          <p className="text-text-muted text-sm">{t("common.noData")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGyms.map((gym) => {
            const isSelected = selectedGymId === gym.id;
            const theme = getThemeClasses(gym.color);

            return (
              <div
                key={gym.id}
                onClick={() => onSelectGym(gym)}
                className={`glass-card relative flex flex-col justify-between rounded-3xl p-5 border transition-all duration-300 cursor-pointer overflow-hidden group ${
                  isSelected
                    ? `border-accent shadow-lg shadow-accent/10 translate-y-[-4px]`
                    : `border-border/50 hover:-translate-y-1 hover:border-text-dim/40 ${theme.shadow}`
                }`}
              >
                {/* Accent glow on hover */}
                <div
                  className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-[40px] opacity-20 transition-all duration-500 group-hover:scale-150 ${
                    gym.color === "orange"
                      ? "bg-orange-500"
                      : gym.color === "emerald"
                        ? "bg-emerald-500"
                        : "bg-indigo-500"
                  }`}
                />

                <div>
                  {/* Gym Logo & Header */}
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                    <GymPhoto
                      src={gym.logo}
                      alt={gym.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-border/50 shadow-sm"
                      iconClassName="w-5 h-5"
                    />
                    <div>
                      <h3 className="font-bold text-text text-base leading-tight group-hover:text-accent transition-colors duration-300">
                        {gym.name}
                      </h3>
                      <p className="text-text-muted text-xs flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-text-dim shrink-0" />
                        <span>{gym.address}</span>
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-text-muted text-xs leading-relaxed mb-4 line-clamp-2">
                    {gym.description}
                  </p>

                  {/* Badges/Meta row */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 bg-bg-input/40 p-2 rounded-xl border border-border/30">
                      <Users className="w-4 h-4 text-text-dim shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-text-dim uppercase font-bold tracking-wider leading-none">
                          Membres
                        </p>
                        <p className="text-xs font-bold text-text mt-0.5 truncate">
                          {gym.member_count} {t("gym.members") || "membres"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-bg-input/40 p-2 rounded-xl border border-border/30">
                      <Activity className="w-4 h-4 text-text-dim shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-text-dim uppercase font-bold tracking-wider leading-none">
                          Spécialité
                        </p>
                        <p className="text-xs font-bold text-text mt-0.5 truncate">
                          {gym.speciality}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hours */}
                  {gym.opening_hours && (
                    <div className="bg-bg-input/20 border border-border/20 rounded-xl p-2.5 text-xs text-text-muted space-y-1 mb-5">
                      <p className="font-semibold text-text flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-text-dim">
                        <Clock className="w-3.5 h-3.5 text-text-dim" />
                        Horaires d'ouverture
                      </p>
                      {Object.entries(gym.opening_hours).map(
                        ([days, hours]) => (
                          <div
                            key={days}
                            className="flex justify-between font-medium text-[11px]"
                          >
                            <span className="capitalize">{days}</span>
                            <span className="text-text font-semibold">
                              {hours}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* Join action */}
                <button
                  type="button"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    isSelected
                      ? "bg-accent text-on-accent shadow-accent/20"
                      : "bg-bg-input text-text-muted border border-border/40 hover:bg-bg-input/80 hover:text-text"
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>
                    {isSelected
                      ? "Club Sélectionné"
                      : t("gym.joinBtn") || "Rejoindre ce club"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

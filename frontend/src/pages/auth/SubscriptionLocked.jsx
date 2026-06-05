import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/TranslationContext";
import { 
  Lock, 
  RefreshCw, 
  LogOut, 
  MapPin, 
  Phone, 
  ShieldAlert, 
  CheckCircle2, 
  Building2, 
  AlertCircle 
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { LanguageSwitcher } from "../../components/ui";

export default function SubscriptionLocked() {
  const { user, refreshUser, logout } = useAuth();
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState("");

  const status = user?.subscription_status || "pending";
  const gym = user?.gym;

  const handleRefresh = async () => {
    setChecking(true);
    setMsg("");
    try {
      const refreshed = await refreshUser();
      if (refreshed?.subscription_status === "active") {
        setMsg(t("subscription.locked.activeSuccess") || "Votre abonnement est désormais actif ! Chargement...");
        window.location.reload();
      } else {
        setMsg(t("subscription.locked.statusUnchanged") || "Statut inchangé.");
      }
    } catch (err) {
      setMsg(t("subscription.locked.statusError") || "Impossible d'actualiser le statut.");
    } finally {
      setChecking(false);
    }
  };

  // Resolve layout info based on subscription status
  const getStatusDetails = () => {
    switch (status) {
      case "suspended":
        return {
          title: t("subscription.suspended.title"),
          message: t("subscription.suspended.message"),
          desc: t("subscription.suspended.desc"),
          icon: <ShieldAlert className="w-12 h-12 text-danger animate-pulse" />,
          colorClass: "text-danger border-danger/30 bg-danger/10",
        };
      case "expired":
        return {
          title: t("subscription.expired.title"),
          message: t("subscription.expired.message"),
          desc: t("subscription.expired.desc"),
          icon: <AlertCircle className="w-12 h-12 text-warning animate-bounce" />,
          colorClass: "text-warning border-warning/30 bg-warning/10",
        };
      case "pending":
      default:
        return {
          title: t("subscription.pending.title"),
          message: t("subscription.pending.message"),
          desc: t("subscription.pending.desc"),
          icon: <Lock className="w-12 h-12 text-accent animate-pulse" />,
          colorClass: "text-accent border-accent/30 bg-accent/10",
        };
    }
  };

  const details = getStatusDetails();

  // Handle parsing of advantages (which might be stored as string or array)
  const renderAdvantages = () => {
    let list = [];
    if (gym?.advantages) {
      if (Array.isArray(gym.advantages)) {
        list = gym.advantages;
      } else {
        try {
          list = JSON.parse(gym.advantages);
        } catch {
          list = [];
        }
      }
    }
    if (list.length === 0) {
      list = ["Accès libre", "Équipements professionnels", "Suivi de progression"];
    }
    return list.map((adv, idx) => (
      <div key={idx} className="flex items-center gap-2 text-xs text-text-muted">
        <CheckCircle2 className="w-4 h-4 text-emerald flex-shrink-0" />
        <span>{adv}</span>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Ambient backgrounds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full surface-accent blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full surface-info blur-[120px]" />
      </div>

      <div className="w-full max-w-3xl relative z-10 py-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Status Block */}
          <div className="md:col-span-7 flex flex-col justify-between glass-card rounded-2xl p-6 shadow-card border border-border">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center justify-center p-4 bg-bg border border-border rounded-2xl mb-4">
                {details.icon}
              </div>
              <h1 className="text-2xl font-black text-text tracking-tight mb-2">
                {details.title}
              </h1>
              <div className={`p-4 border rounded-xl mb-4 text-xs font-semibold ${details.colorClass}`}>
                {details.message}
              </div>
              <p className="text-xs text-text-muted leading-relaxed mb-6 font-medium">
                {details.desc}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleRefresh}
                disabled={checking}
                className="btn-accent w-full rounded-xl py-3 text-xs flex items-center justify-center gap-2 font-bold shadow-accent"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
                {checking ? t("subscription.locked.refreshing") || "Actualisation..." : t("subscription.locked.verifyStatus") || "Vérifier le statut"}
              </button>

              <button
                onClick={logout}
                className="w-full rounded-xl border border-border bg-bg hover:bg-bg-input text-xs text-text-muted hover:text-text font-bold py-3 flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                {t("subscription.btn.logout")}
              </button>

              {msg && (
                <p className="text-center text-xs text-accent mt-2 font-semibold">
                  {msg}
                </p>
              )}
            </div>
          </div>

          {/* Gym & Plan Summary Block */}
          <div className="md:col-span-5 glass-card rounded-2xl p-6 shadow-card border border-border flex flex-col justify-between bg-bg-card/40">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <Building2 className="w-5 h-5 text-accent" />
                <h2 className="text-base font-bold text-text uppercase tracking-wide">
                  {gym?.name || "Votre club"}
                </h2>
              </div>

              {/* Gym contact details */}
              <div className="space-y-2 mb-6">
                {gym?.address && (
                  <div className="flex items-start gap-2 text-xs text-text-muted leading-tight">
                    <MapPin className="w-4 h-4 text-text-dim flex-shrink-0 mt-0.5" />
                    <span>{gym.address}, {gym.city}</span>
                  </div>
                )}
                {gym?.phone && (
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Phone className="w-4 h-4 text-text-dim flex-shrink-0" />
                    <span>{gym.phone}</span>
                  </div>
                )}
              </div>

              {/* Gym Plans */}
              <div className="bg-bg/40 border border-border rounded-xl p-5 mb-6">
                <h3 className="text-xs font-bold text-text mb-3 uppercase tracking-wider">
                  {t("subscription.locked.pricingTitle") || "Formules Tarifaires"}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-xs font-semibold text-text-muted">
                      {t("subscription.locked.monthly") || "Mensuel"}
                    </span>
                    <span className="text-sm font-extrabold text-accent">
                      {gym?.price_monthly || 300} {gym?.currency || "DH"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-semibold text-text-muted">
                      {t("subscription.locked.yearly") || "Annuel"}
                    </span>
                    <span className="text-sm font-extrabold text-accent">
                      {gym?.price_yearly || 2500} {gym?.currency || "DH"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Advantages List */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-2">
                  {t("subscription.locked.advantagesTitle") || "Avantages Inclus"}
                </h3>
                {renderAdvantages()}
              </div>
            </div>

            <p className="text-center text-[10px] text-text-dim mt-6 font-semibold tracking-wider uppercase">
              I-GYM CONNECT
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

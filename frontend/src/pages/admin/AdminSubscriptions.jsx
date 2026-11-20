import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";
import {
  CreditCard,
  Search,
  CheckCircle,
  AlertTriangle,
  Coins,
  Calendar,
  XCircle,
  RotateCcw,
  User,
  Sparkles,
  Loader2,
  Clock,
  Ban
} from "lucide-react";

export default function AdminSubscriptions() {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("pending"); // pending, active, expired
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({
    total_sales_this_month: 0,
    active_count: 0,
    pending_count: 0,
    expired_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // id of row loading
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Payment Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    subId: null,
    memberName: "",
    plan: "",
    price: 0,
    paymentMethod: "cash",
  });

  // Renewal Modal state
  const [renewModal, setRenewModal] = useState({
    isOpen: false,
    subId: null,
    userId: null,
    memberName: "",
    plan: "mensuel",
    price: 300,
    paymentMethod: "cash",
  });

  // Suspend Modal state
  const [suspendModal, setSuspendModal] = useState({
    isOpen: false,
    subId: null,
    memberName: "",
  });

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSubscriptions();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, activeTab]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/subscriptions/stats");
      const data = res.data;
      setStats({
        total_sales_this_month: data.monthly_revenue || 0,
        active_count: data.active_members || 0,
        pending_count: data.pending_payments || 0,
        expired_count: (data.expired_members || 0) + (data.suspended_members || 0),
      });
    } catch (err) {
      console.error("Error fetching subscription stats", err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/admin/subscriptions", {
        params: {
          status: activeTab,
          search: search,
        },
      });
      setSubscriptions(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Erreur de chargement des abonnements."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleValidateClick = (sub) => {
    setConfirmModal({
      isOpen: true,
      subId: sub.id,
      memberName: sub.user?.name || "Adhérent",
      plan: sub.plan,
      price: sub.price,
      paymentMethod: "cash",
    });
  };

  const handleConfirmValidation = async () => {
    const { subId, paymentMethod } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setActionLoading(subId);
    setSuccessMsg("");
    setError("");

    try {
      const res = await api.post(`/admin/subscriptions/${subId}/validate`, {
        payment_method: paymentMethod,
      });
      setSuccessMsg(res.data.message || "Paiement validé avec succès.");
      fetchSubscriptions();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la validation.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendClick = (sub) => {
    setSuspendModal({
      isOpen: true,
      subId: sub.id,
      memberName: sub.user?.name || "Adhérent",
    });
  };

  const handleConfirmSuspend = async () => {
    const { subId } = suspendModal;
    setSuspendModal((prev) => ({ ...prev, isOpen: false }));
    setActionLoading(subId);
    setSuccessMsg("");
    setError("");

    try {
      const res = await api.post(`/admin/subscriptions/${subId}/suspend`);
      setSuccessMsg(res.data.message || "Abonnement suspendu.");
      fetchSubscriptions();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la suspension.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenewClick = (sub) => {
    setRenewModal({
      isOpen: true,
      subId: sub.id,
      userId: sub.user_id,
      memberName: sub.user?.name || "Adhérent",
      plan: sub.plan || "mensuel",
      price: sub.plan === "annuel" ? 2500 : 300,
      paymentMethod: "cash",
    });
  };

  const handleConfirmRenewal = async () => {
    const { userId, plan, price, paymentMethod } = renewModal;
    setRenewModal((prev) => ({ ...prev, isOpen: false }));
    setSuccessMsg("");
    setError("");

    try {
      setLoading(true);
      const res = await api.post(`/admin/subscriptions/${userId}/renew`, {
        plan,
        price,
        payment_method: paymentMethod,
      });
      setSuccessMsg(res.data.message || "Abonnement renouvelé.");
      fetchSubscriptions();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du renouvellement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-accent animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold text-text">
              {t("nav.subscriptions")}
            </h1>
            <p className="text-xs text-text-muted">
              Validez les paiements physiques et suivez le chiffre d'affaires
            </p>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="glass-card rounded-2xl p-6 border border-border/50 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-accent/10 p-2 rounded-xl text-accent">
            <Coins className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider">
            Ventes (Mois)
          </p>
          <h3 className="text-2xl font-black text-text mt-2">
            {stats.total_sales_this_month} DH
          </h3>
          <p className="text-[10px] text-text-dim mt-1">Paiements encaissés</p>
        </div>

        {/* Pending */}
        <div className="glass-card rounded-2xl p-6 border border-border/50 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-amber-500/10 p-2 rounded-xl text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider">
            En attente
          </p>
          <h3 className="text-2xl font-black text-text mt-2">
            {stats.pending_count}
          </h3>
          <p className="text-[10px] text-text-dim mt-1">Nouveaux dossiers</p>
        </div>

        {/* Active */}
        <div className="glass-card rounded-2xl p-6 border border-border/50 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-emerald/10 p-2 rounded-xl text-emerald">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider">
            Actifs
          </p>
          <h3 className="text-2xl font-black text-text mt-2">
            {stats.active_count}
          </h3>
          <p className="text-[10px] text-text-dim mt-1">Accès autorisés</p>
        </div>

        {/* Expired */}
        <div className="glass-card rounded-2xl p-6 border border-border/50 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-danger/10 p-2 rounded-xl text-danger">
            <XCircle className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider">
            Expirés
          </p>
          <h3 className="text-2xl font-black text-text mt-2">
            {stats.expired_count}
          </h3>
          <p className="text-[10px] text-text-dim mt-1">Accès bloqués</p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-card/20 p-4 rounded-2xl border border-border/40 backdrop-blur-sm">
        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wide ${
              activeTab === "pending"
                ? "bg-accent text-on-accent shadow-accent"
                : "text-text-muted hover:bg-bg-hover"
            }`}
          >
            En attente ({stats.pending_count})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wide ${
              activeTab === "active"
                ? "bg-accent text-on-accent shadow-accent"
                : "text-text-muted hover:bg-bg-hover"
            }`}
          >
            Actifs ({stats.active_count})
          </button>
          <button
            onClick={() => setActiveTab("expired")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wide ${
              activeTab === "expired"
                ? "bg-accent text-on-accent shadow-accent"
                : "text-text-muted hover:bg-bg-hover"
            }`}
          >
            Expirés / Suspendus ({stats.expired_count})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            placeholder="Rechercher par adhérent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-input/50 border border-border/40 focus:border-accent text-text text-sm rounded-xl focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      {loading && subscriptions.length === 0 ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-border/50 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-bg-input/30 text-text-dim text-xs uppercase tracking-wider border-b border-border/50">
                  <th className="px-6 py-4 font-bold">Adhérent</th>
                  <th className="px-6 py-4 font-bold">Formule</th>
                  <th className="px-6 py-4 font-bold">Prix</th>
                  <th className="px-6 py-4 font-bold">Date de Fin</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {subscriptions.map((sub) => {
                  const daysLeft = sub.end_date
                    ? Math.ceil(
                        (new Date(sub.end_date) - new Date()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0;

                  return (
                    <tr key={sub.id} className="hover:bg-bg-hover transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-text">
                              {sub.user?.name}
                            </p>
                            <p className="text-xs text-text-muted">
                              {sub.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-accent/10 text-accent">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-text">
                        {sub.price} DH
                      </td>
                      <td className="px-6 py-4">
                        {sub.end_date ? (
                          <div>
                            <p className="text-xs font-semibold text-text">
                              {new Date(sub.end_date).toLocaleDateString()}
                            </p>
                            {activeTab === "active" && (
                              <p
                                className={`text-[10px] font-bold ${
                                  daysLeft <= 7 ? "text-danger" : "text-emerald"
                                }`}
                              >
                                {daysLeft <= 0
                                  ? "Expire aujourd'hui"
                                  : `${daysLeft} jours restants`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-dim text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {actionLoading === sub.id ? (
                          <Loader2 className="w-5 h-5 animate-spin ml-auto text-accent" />
                        ) : activeTab === "pending" ? (
                          <button
                            onClick={() => handleValidateClick(sub)}
                            className="btn-accent px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide flex items-center gap-1.5 ml-auto shadow-accent"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Valider Paiement
                          </button>
                        ) : activeTab === "active" ? (
                          <button
                            onClick={() => handleSuspendClick(sub)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-danger/30 hover:bg-danger/10 text-danger transition-all ml-auto flex items-center gap-1.5"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Suspendre
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRenewClick(sub)}
                            className="btn-accent px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide flex items-center gap-1.5 ml-auto shadow-accent"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Renouveler
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-text-muted">
                      Aucun abonnement trouvé dans cette catégorie.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-[95%] sm:w-full max-w-md glass-card border border-border/60 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-text mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent animate-spin" />
              Confirmer le Paiement
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Valider l'abonnement physique pour{" "}
              <strong className="text-text">{confirmModal.memberName}</strong>.
            </p>

            <div className="space-y-4 mb-6">
              <div className="bg-bg/60 border border-border/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Formule choisie :</span>
                  <span className="font-bold text-text uppercase">
                    {confirmModal.plan}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Montant à régler :</span>
                  <span className="font-black text-accent">
                    {confirmModal.price} DH
                  </span>
                </div>
              </div>

              {/* Note de règlement */}
              <div className="p-3 bg-bg/40 border border-border/40 rounded-xl flex items-center gap-2 text-xs text-text-muted">
                <Coins className="w-4 h-4 text-accent" />
                <span>Règlement physique en espèces uniquement.</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1 rounded-xl border border-border bg-bg hover:bg-bg-input py-2.5 text-xs text-text-muted font-bold transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmValidation}
                className="flex-1 btn-accent py-2.5 rounded-xl text-xs font-bold shadow-accent"
              >
                Valider l'accès
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {renewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-[95%] sm:w-full max-w-md glass-card border border-border/60 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-text mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-accent animate-spin" />
              Renouveler l'abonnement
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Renouvellement pour{" "}
              <strong className="text-text">{renewModal.memberName}</strong>.
            </p>

            <div className="space-y-4 mb-6">
              {/* Plan Choice */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-muted uppercase">
                  Formule
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setRenewModal((prev) => ({
                        ...prev,
                        plan: "mensuel",
                        price: 300,
                      }))
                    }
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      renewModal.plan === "mensuel"
                        ? "border-accent bg-accent/10 text-accent font-black"
                        : "border-border bg-bg/40 text-text-muted"
                    }`}
                  >
                    Mensuel (300 DH)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRenewModal((prev) => ({
                        ...prev,
                        plan: "annuel",
                        price: 2500,
                      }))
                    }
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      renewModal.plan === "annuel"
                        ? "border-accent bg-accent/10 text-accent font-black"
                        : "border-border bg-bg/40 text-text-muted"
                    }`}
                  >
                    Annuel (2500 DH)
                  </button>
                </div>
              </div>

              {/* Note de règlement */}
              <div className="p-3 bg-bg/40 border border-border/40 rounded-xl flex items-center gap-2 text-xs text-text-muted">
                <Coins className="w-4 h-4 text-accent" />
                <span>Règlement physique en espèces uniquement.</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setRenewModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1 rounded-xl border border-border bg-bg hover:bg-bg-input py-2.5 text-xs text-text-muted font-bold transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRenewal}
                className="flex-1 btn-accent py-2.5 rounded-xl text-xs font-bold shadow-accent"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-[95%] sm:w-full max-w-md glass-card border border-border/60 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-danger mb-2 flex items-center gap-2">
              <Ban className="w-5 h-5 text-danger" />
              Suspendre l'abonnement
            </h3>
            <p className="text-xs text-text-muted mb-6">
              Êtes-vous sûr de vouloir suspendre l'abonnement de{" "}
              <strong className="text-text">{suspendModal.memberName}</strong> ?
              Cette action bloquera son accès immédiatement.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setSuspendModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1 rounded-xl border border-border bg-bg hover:bg-bg-input py-2.5 text-xs text-text-muted font-bold transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="flex-1 bg-danger hover:bg-danger/90 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-danger/20"
              >
                Suspendre l'accès
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  Dumbbell,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Calendar,
  Scale,
  Ruler,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { LanguageSwitcher } from "../../components/ui";
import { useTranslation } from "../../context/TranslationContext";
import GymsPage from "../GymsPage";
import GymPhoto from "../../components/ui/GymPhoto";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Steps state: 1 = Gym Selection, 2 = Form Registration
  const [step, setStep] = useState(1);
  const [selectedGym, setSelectedGym] = useState(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("mensuel");

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setApiError("");

    // Client-side validation for required fields
    const errors = {};
    if (!firstName.trim()) errors.firstName = t("auth.error.firstName");
    if (!lastName.trim()) errors.lastName = t("auth.error.lastName");
    if (!age) errors.age = t("auth.error.age");
    if (!email.trim()) errors.email = t("auth.error.email");
    if (!password) errors.password = t("auth.error.password");

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    // Build payload mapping fields (note: weight/height/gender are optional)
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      password,
      age: parseInt(age, 10),
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      gender: gender || null,
      gym_id: selectedGym?.id,
      language_preference: lang,
      plan: plan,
    };

    try {
      await register(payload);
      navigate("/adherent"); // Newly registered user lands on Adherent dashboard by default
    } catch (err) {
      if (err.response?.data?.errors) {
        // Backend Laravel validation errors
        const serverErrors = {};
        const responseErrors = err.response.data.errors;
        if (responseErrors.first_name)
          serverErrors.firstName = responseErrors.first_name[0];
        if (responseErrors.last_name)
          serverErrors.lastName = responseErrors.last_name[0];
        if (responseErrors.email) serverErrors.email = responseErrors.email[0];
        if (responseErrors.password)
          serverErrors.password = responseErrors.password[0];
        if (responseErrors.age) serverErrors.age = responseErrors.age[0];
        if (responseErrors.weight)
          serverErrors.weight = responseErrors.weight[0];
        if (responseErrors.height)
          serverErrors.height = responseErrors.height[0];
        if (responseErrors.gender)
          serverErrors.gender = responseErrors.gender[0];
        setFieldErrors(serverErrors);
      } else {
        setApiError(
          err.response?.data?.message ||
            "Une erreur est survenue lors de l'inscription.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500" style={{ background: 'var(--bg)' }}>

      {/* Gym background */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("/gym_landing_bg.png")' }} />

      {/* Adaptive overlay */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(9,13,22,0.90) 0%, rgba(15,23,42,0.85) 100%)'
            : 'linear-gradient(135deg, rgba(242,242,247,0.90) 0%, rgba(255,255,255,0.85) 100%)',
        }}
      />

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Accent glow */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[140px] pointer-events-none opacity-25" style={{ background: 'var(--accent-muted)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full blur-[120px] pointer-events-none opacity-20" style={{ background: 'var(--info-muted)' }} />

      {/* Header controls */}
      <div className="absolute top-4 right-4 z-20">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border shadow-sm backdrop-blur-md"
          style={{ background: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.7)', borderColor: 'var(--border)' }}
        >
          <LanguageSwitcher />
          <div style={{ width: '1px', height: '22px', background: 'var(--border)' }} />
          <ThemeToggle />
        </div>
      </div>

      {step === 1 ? (
        <div className="w-full max-w-6xl relative z-10 transition-all duration-500 py-8">
          {/* Back to welcome */}
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-accent mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("auth.backToWelcome")}
          </button>

          <GymsPage
            selectedGymId={selectedGym?.id}
            onSelectGym={(gym) => {
              setSelectedGym(gym);
              setStep(2);
            }}
          />
        </div>
      ) : (
        <div className="w-full max-w-xl relative z-10 transition-all duration-500 py-8 animate-fade-in">
          {/* Back to welcome */}
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-accent mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back") || "Retour"}
          </button>

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-accent to-accent-dark rounded-2xl shadow-accent mb-3">
              <Dumbbell className="w-7 h-7 text-on-accent" />
            </div>
            <h1 className="text-4xl font-black gradient-text tracking-tight">
              {t("auth.register")}
            </h1>
            <p className="text-text-muted mt-1 text-xs font-medium tracking-wide">
              {t("auth.joinBestClub")}
            </p>
          </div>

          {/* Card */}
          <div className="glass-card rounded-2xl p-7 shadow-card">
            {/* Gym info summary */}
            <div className="flex items-center justify-between p-3.5 bg-accent/10 border border-accent/20 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <GymPhoto
                  src={selectedGym?.logo}
                  alt={selectedGym?.name || "Club choisi"}
                  className="w-8 h-8 rounded-lg object-cover"
                  iconClassName="w-4 h-4"
                />
                <div>
                  <p className="text-[10px] text-accent font-bold uppercase tracking-wider leading-none">
                    Club choisi
                  </p>
                  <p className="text-sm font-bold text-text mt-0.5">
                    {selectedGym?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-accent hover:underline font-bold"
              >
                {t("common.filter") || "Changer"}
              </button>
            </div>

            {/* General API error */}
            {apiError && (
              <div className="mb-5 p-3.5 surface-danger border border-danger-muted rounded-xl text-danger text-sm flex items-center gap-2.5">
                <span className="text-base">⚠️</span>
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom & Prénom Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide uppercase">
                    {t("auth.firstName")} <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t("auth.placeholder.firstName")}
                      className={`input-dark w-full rounded-xl pl-9 pr-3 py-3 text-sm bg-bg-input ${fieldErrors.firstName ? "border-danger focus:border-danger" : ""}`}
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <span className="text-danger text-xs mt-1 block">
                      {fieldErrors.firstName}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide uppercase">
                    {t("auth.lastName")} <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t("auth.placeholder.lastName")}
                      className={`input-dark w-full rounded-xl pl-9 pr-3 py-3 text-sm bg-bg-input ${fieldErrors.lastName ? "border-danger focus:border-danger" : ""}`}
                    />
                  </div>
                  {fieldErrors.lastName && (
                    <span className="text-danger text-xs mt-1 block">
                      {fieldErrors.lastName}
                    </span>
                  )}
                </div>
              </div>

              {/* Age & Sexe Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide uppercase">
                    {t("auth.age")} <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder={t("auth.placeholder.age")}
                      className={`input-dark w-full rounded-xl pl-9 pr-3 py-3 text-sm bg-bg-input ${fieldErrors.age ? "border-danger focus:border-danger" : ""}`}
                    />
                  </div>
                  {fieldErrors.age && (
                    <span className="text-danger text-xs mt-1 block">
                      {fieldErrors.age}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide uppercase">
                    {t("auth.gender")}{" "}
                    <span className="text-text-dim text-[10px] font-normal">
                      {t("auth.optional")}
                    </span>
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="select-modern pl-9"
                    >
                      <option value="">{t("auth.select")}</option>
                      <option value="homme">{t("auth.male")}</option>
                      <option value="femme">{t("auth.female")}</option>
                      <option value="autre">{t("auth.other")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Poids & Taille Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide uppercase">
                    {t("auth.weight")}{" "}
                    <span className="text-text-dim text-[10px] font-normal">
                      {t("auth.optional")}, kg
                    </span>
                  </label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                    <input
                      type="number"
                      step="0.1"
                      min="10"
                      max="300"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder={t("auth.placeholder.weight")}
                      className="input-dark w-full rounded-xl pl-9 pr-3 py-3 text-sm bg-bg-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide uppercase">
                    {t("auth.height")}{" "}
                    <span className="text-text-dim text-[10px] font-normal">
                      {t("auth.optional")}, cm
                    </span>
                  </label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                    <input
                      type="number"
                      min="50"
                      max="250"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder={t("auth.placeholder.height")}
                      className="input-dark w-full rounded-xl pl-9 pr-3 py-3 text-sm bg-bg-input"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide uppercase">
                  {t("auth.email")} <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.placeholder.email")}
                    className={`input-dark w-full rounded-xl pl-9 pr-3 py-3 text-sm bg-bg-input ${fieldErrors.email ? "border-danger focus:border-danger" : ""}`}
                  />
                </div>
                {fieldErrors.email && (
                  <span className="text-danger text-xs mt-1 block">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide uppercase">
                  {t("auth.password")} <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.placeholder.password")}
                    className={`input-dark w-full rounded-xl pl-9 pr-9 py-3 text-sm bg-bg-input ${fieldErrors.password ? "border-danger focus:border-danger" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors"
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="text-danger text-xs mt-1 block">
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              {/* Subscription Plan Selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-text-muted tracking-wide uppercase">
                  {t("subscription.plan")}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Monthly Plan */}
                  <div
                    onClick={() => setPlan("mensuel")}
                    className={`cursor-pointer border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 ${
                      plan === "mensuel"
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border bg-bg-input hover:border-text-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-text uppercase tracking-wide">
                        {t("subscription.monthly")}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          plan === "mensuel"
                            ? "border-accent bg-accent"
                            : "border-text-dim"
                        }`}
                      >
                        {plan === "mensuel" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-on-accent" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-accent leading-none">
                        {selectedGym?.price_monthly || 300} {selectedGym?.currency || 'DH'}
                      </p>
                      <p className="text-[10px] text-text-dim mt-1.5">
                        / {t("subscription.monthly")?.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Yearly Plan */}
                  <div
                    onClick={() => setPlan("annuel")}
                    className={`cursor-pointer border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 ${
                      plan === "annuel"
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border bg-bg-input hover:border-text-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-text uppercase tracking-wide">
                        {t("subscription.yearly")}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          plan === "annuel"
                            ? "border-accent bg-accent"
                            : "border-text-dim"
                        }`}
                      >
                        {plan === "annuel" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-on-accent" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-accent leading-none">
                        {selectedGym?.price_yearly || 2500} {selectedGym?.currency || 'DH'}
                      </p>
                      <p className="text-[10px] text-text-dim mt-1.5">
                        / {t("subscription.yearly")?.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Dumbbell className="w-4 h-4" />
                )}
                {loading ? t("auth.loginLoading") : t("auth.register")}
              </button>
            </form>

            <div className="mt-6 text-center text-xs">
              <span className="text-text-dim">
                {t("auth.alreadyRegistered")}{" "}
              </span>
              <button
                onClick={() => navigate("/login")}
                className="font-bold text-accent hover:underline transition-all"
              >
                {t("auth.login")}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-text-dim mt-6">
            I-Gym v2.0 — Hackathon Edition
          </p>
        </div>
      )}
    </div>
  );
}

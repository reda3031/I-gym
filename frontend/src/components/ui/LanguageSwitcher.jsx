import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';

/**
 * LanguageSwitcher — Sélecteur de langue sous forme de dropdown premium
 * Affiche l'emoji (drapeau) de la langue active, et dévoile les autres langues au clic
 */
export default function LanguageSwitcher({ compact = false }) {
  const { lang, changeLanguage, availableLanguages, isRtl } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const labels = {
    fr: { flag: '🇫🇷', label: 'FR', full: 'Français' },
    en: { flag: '🇬🇧', label: 'EN', full: 'English' },
    ar: { flag: '🇸🇦', label: 'AR', full: 'العربية' },
    es: { flag: '🇪🇸', label: 'ES', full: 'Español' },
    de: { flag: '🇩🇪', label: 'DE', full: 'Deutsch' },
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (compact) {
    return (
      <select
        value={lang}
        onChange={(e) => changeLanguage(e.target.value)}
        className="select-modern text-xs py-1 px-2.5 pr-8"
        aria-label="Langue"
      >
        {availableLanguages.map((l) => (
          <option key={l} value={l}>
            {labels[l]?.flag} {labels[l]?.full}
          </option>
        ))}
      </select>
    );
  }

  const currentLang = labels[lang] || labels.fr;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bouton contenant l'emoji de la langue actuelle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-bg-hover flex items-center justify-center transition-all border border-border hover:opacity-90 active:scale-95"
        title={currentLang.full}
        aria-label="Choisir la langue"
      >
        <span className="text-xl leading-none select-none">{currentLang.flag}</span>
      </button>

      {/* Dropdown d'options avec animation et support RTL */}
      {isOpen && (
        <div
          className={`absolute mt-2 w-36 rounded-xl overflow-hidden z-50 py-1 ${isRtl ? 'left-0' : 'right-0'}`}
          style={{
            background: 'var(--manar-card-bg)',
            border: '1px solid var(--manar-card-border)',
            boxShadow: 'var(--manar-card-shadow)',
            animation: 'modalScaleIn 0.15s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {availableLanguages.map((l) => {
            const item = labels[l];
            if (!item) return null;
            const isSelected = lang === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => {
                  changeLanguage(l);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-bg-hover transition-colors duration-150"
                style={{
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                }}
              >
                <span className="text-base leading-none select-none">{item.flag}</span>
                <span>{item.full}</span>
                {isSelected && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

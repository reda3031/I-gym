import React, { useEffect, useRef } from 'react';

/**
 * Modal générique — inspiré du système de modales "Manar"
 * Props :
 *   isOpen   : bool
 *   onClose  : fn
 *   title    : string
 *   size     : 'sm' | 'md' | 'lg' | 'xl' (défaut: 'md')
 *   children : ReactNode
 *   footer   : ReactNode (optionnel)
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
}) {
  const overlayRef = useRef(null);
  const panelRef   = useRef(null);

  // Fermeture avec Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Empêcher le scroll du body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ animation: 'modalFadeIn 0.2s ease' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative w-full ${sizeClasses[size]} rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          animation: 'modalScaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--text-strong)' }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ color: 'var(--text)' }}>
          {children}
        </div>

        {/* Footer (optionnel) */}
        {footer && (
          <div
            className="flex-shrink-0 px-6 py-4 flex items-center justify-end gap-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

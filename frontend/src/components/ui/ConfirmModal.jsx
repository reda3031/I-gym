import React, { useState } from 'react';
import Modal from './Modal';
import { useTranslation } from '../../context/TranslationContext';

/**
 * ConfirmModal — Modale de confirmation générique (style Manar)
 * Props:
 *   isOpen   : bool
 *   onClose  : fn
 *   onConfirm: fn
 *   title    : string (optionnel — utilise la traduction par défaut)
 *   message  : string
 *   type     : 'danger' | 'warning' | 'accent' (défaut: 'danger')
 *   confirmLabel : string
 *   cancelLabel  : string
 *   loading  : bool
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  confirmLabel,
  cancelLabel,
  loading = false,
}) {
  const { t } = useTranslation();

  const colors = {
    danger: {
      bg:   'var(--danger-muted)',
      icon: 'var(--danger)',
      btn:  'var(--danger)',
      hover:'var(--danger-hover)',
    },
    warning: {
      bg:   'var(--warning-muted)',
      icon: 'var(--warning)',
      btn:  'var(--warning)',
      hover:'rgba(245,158,11,0.8)',
    },
    accent: {
      bg:   'var(--accent-muted)',
      icon: 'var(--accent)',
      btn:  'var(--accent)',
      hover:'var(--accent-dark)',
    },
  };

  const c = colors[type] || colors.danger;

  const icons = {
    danger: (
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    ),
    warning: (
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    ),
    accent: (
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('confirm.title')}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            {cancelLabel || t('confirm.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150"
            style={{ background: c.btn }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = c.hover)}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = c.btn)}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('confirm.loading')}
              </span>
            ) : (
              confirmLabel || t('confirm.ok')
            )}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        {/* Icône */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: c.bg }}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            style={{ color: c.icon }}>
            {icons[type] || icons.danger}
          </svg>
        </div>
        {/* Message */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>
      </div>
    </Modal>
  );
}

import React from 'react';
import Modal from './Modal';
import { useTranslation } from '../../context/TranslationContext';

/**
 * ReservationModal — Modale de réservation d'un cours (style Manar)
 * Props:
 *   isOpen    : bool
 *   onClose   : fn
 *   onConfirm : fn(courseId)
 *   course    : { id, name, type, coach, startTime, endTime, date, spots, room }
 *   loading   : bool
 */
export default function ReservationModal({ isOpen, onClose, onConfirm, course, loading = false }) {
  const { t } = useTranslation();

  if (!course) return null;

  const typeColors = {
    cardio:       { bg: 'var(--course-cardio-bg)',       text: 'var(--course-cardio-text)',       border: 'var(--course-cardio-border)' },
    hiit:         { bg: 'var(--course-hiit-bg)',         text: 'var(--course-hiit-text)',         border: 'var(--course-hiit-border)' },
    crossfit:     { bg: 'var(--course-crossfit-bg)',     text: 'var(--course-crossfit-text)',     border: 'var(--course-crossfit-border)' },
    yoga:         { bg: 'var(--course-yoga-bg)',         text: 'var(--course-yoga-text)',         border: 'var(--course-yoga-border)' },
    pilates:      { bg: 'var(--course-pilates-bg)',      text: 'var(--course-pilates-text)',      border: 'var(--course-pilates-border)' },
    musculation:  { bg: 'var(--course-musculation-bg)',  text: 'var(--course-musculation-text)',  border: 'var(--course-musculation-border)' },
    zumba:        { bg: 'var(--course-zumba-bg)',        text: 'var(--course-zumba-text)',        border: 'var(--course-zumba-border)' },
    default:      { bg: 'var(--course-default-bg)',      text: 'var(--course-default-text)',      border: 'var(--course-default-border)' },
  };
  const c = typeColors[course.type?.toLowerCase()] || typeColors.default;

  const spotsLeft = course.spots ?? '?';
  const spotsLow  = typeof spotsLeft === 'number' && spotsLeft <= 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('reservation.title')}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
            style={{ background: 'var(--bg-hover)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onConfirm(course.id)}
            disabled={loading}
            className="btn-accent px-5 py-2 rounded-lg text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {t('common.loading')}
              </span>
            ) : t('reservation.confirm')}
          </button>
        </>
      }
    >
      {/* Carte cours */}
      <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid var(--border)' }}>
        {/* En-tête coloré */}
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background: c.bg, borderBottom: `1px solid ${c.border}` }}>
          <div>
            <h4 className="font-semibold text-base" style={{ color: c.text }}>{course.name}</h4>
            <p className="text-xs mt-0.5" style={{ color: c.text, opacity: 0.8 }}>
              {course.coach && `${t('reservation.coach')}: ${course.coach}`}
            </p>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: c.border, color: c.text }}
          >
            {course.type}
          </span>
        </div>

        {/* Détails */}
        <div className="px-5 py-4 grid grid-cols-2 gap-4">
          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 surface-info">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: 'var(--info)' }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{t('reservation.date')}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{course.date || '—'}</p>
            </div>
          </div>

          {/* Horaire */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 surface-accent">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: 'var(--accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{t('reservation.time')}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>
                {course.startTime} — {course.endTime}
              </p>
            </div>
          </div>

          {/* Salle */}
          {course.room && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 surface-warning">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                  style={{ color: 'var(--warning)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{t('reservation.room')}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{course.room}</p>
              </div>
            </div>
          )}

          {/* Places restantes */}
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${spotsLow ? 'surface-danger' : 'surface-accent'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: spotsLow ? 'var(--danger)' : 'var(--accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{t('reservation.spots')}</p>
              <p className={`text-sm font-semibold mt-0.5`}
                style={{ color: spotsLow ? 'var(--danger)' : 'var(--accent)' }}>
                {spotsLow
                  ? `⚠ ${spotsLeft} ${t('reservation.spotsLeft')}`
                  : `${spotsLeft} ${t('reservation.spotsLeft')}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Avertissement */}
      <div className="rounded-lg px-4 py-3 flex items-start gap-3 surface-info"
        style={{ border: '1px solid var(--info-border-muted)' }}>
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          style={{ color: 'var(--info)' }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--info)' }}>
          {t('reservation.notice')}
        </p>
      </div>
    </Modal>
  );
}

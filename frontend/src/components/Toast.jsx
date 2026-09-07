import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, dismissToast } from '../services/toastStore';

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

const LABELS = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.type}`}

          role={t.type === 'error' ? 'alert' : 'status'}
          aria-live={t.type === 'error' ? 'assertive' : 'polite'}
        >
          <span className="toast__icon" aria-hidden="true">{ICONS[t.type]}</span>
          <div className="toast__body">
            <strong className="toast__title">{t.title || LABELS[t.type]}</strong>
            <p className="toast__message">{t.message}</p>
          </div>
          <button
            className="toast__close"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
          {t.duration > 0 && (
            <span
              className="toast__progress"
              style={{ animationDuration: `${t.duration}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

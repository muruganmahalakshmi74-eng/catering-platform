let toasts = [];
const listeners = new Set();
let nextId = 0;

const emit = () => {

  toasts = [...toasts];
  listeners.forEach((listener) => listener(toasts));
};

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSnapshot = () => toasts;

export const dismissToast = (id) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

const push = (type, message, { duration = 4000, title } = {}) => {
  if (!message) return null;

  const id = ++nextId;
  toasts = [...toasts, { id, type, message: String(message), title, duration }];
  emit();

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
};

export const toast = {
  success: (message, options) => push('success', message, options),
  error: (message, options) => push('error', message, { duration: 6000, ...options }),
  info: (message, options) => push('info', message, options),
  warning: (message, options) => push('warning', message, options),
  dismiss: dismissToast,
};

export default toast;

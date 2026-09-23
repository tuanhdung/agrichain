// Port AgriChain.toast(message) (js/app-shell.js gốc) — 1 phần tử .toast duy
// nhất trên trang, tự ẩn sau 4s. Bản gốc là hàm global tìm `.toast` trong
// DOM; bản React dùng Context để mọi trang/component con gọi được mà không
// cần biết DOM ở đâu — CSS/markup (.toast, [data-toast-message], .is-visible)
// giữ NGUYÊN từ components.css, không viết lại.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../icons';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_HIDE_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(text);
    setVisible(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), AUTO_HIDE_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast${visible ? ' is-visible' : ''}`} role="status" aria-live="polite">
        <Icon name="shield-check" className="icon--sm" />
        <span data-toast-message>{message}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() phải gọi bên trong <ToastProvider>');
  return ctx;
}

/** @format */

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-xl border shadow-lg text-xs font-medium backdrop-blur-md animate-in slide-in-from-bottom-3 duration-150",
              t.type === "success" &&
                "bg-[var(--surface)] text-[var(--success)] border-[var(--success-border)]",
              t.type === "error" &&
                "bg-[var(--surface)] text-[var(--danger)] border-[var(--danger-border)]",
              (!t.type || t.type === "info") &&
                "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)]"
            )}
          >
            <div className="flex items-center gap-2">
              {t.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {t.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
              {(!t.type || t.type === "info") && <Info className="w-4 h-4 shrink-0 text-[var(--primary)]" />}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return { toast: (type, msg) => console.log(`[Toast ${type}]: ${msg}`) };
  }
  return context;
};

export default ToastProvider;


"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 4000;

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `toast-${++counterRef.current}`;
    setItems((prev) => [...prev, { id, message, variant }]);

    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      timersRef.current.delete(id);
    }, TOAST_DURATION_MS);

    timersRef.current.set(id, timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer items={items} />
    </ToastContext.Provider>
  );
}

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-[#357355] text-white",
  error: "bg-[#c0392b] text-white",
  info: "bg-[#1f1811] text-white",
};

// Container is always in the DOM so the aria-live region is stable;
// screen readers only announce changes to a region that already exists.
function ToastContainer({ items }: { items: ToastItem[] }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-[1000] flex flex-col gap-2"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg ${variantStyles[item.variant]}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}

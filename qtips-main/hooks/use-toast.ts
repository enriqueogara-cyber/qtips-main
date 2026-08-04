import { useCallback, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";

export type ToastMessage = {
  text: string;
  type: ToastType;
};

const AUTO_DISMISS_MS = 3000;

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, type: ToastType = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ text, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, AUTO_DISMISS_MS);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  return { toast, show, hide };
}

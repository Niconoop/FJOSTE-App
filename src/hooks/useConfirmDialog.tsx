import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";

/**
 * Hook that replaces window.confirm() / window.alert() with a styled modal
 * matching the app's existing modal design (glass-card, Unbounded font, etc.).
 */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"confirm" | "alert">("confirm");
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((msg: string, opts: { title?: string } = {}) => {
    setTitle(opts.title || "Bestätigung");
    setDescription(msg);
    setMode("confirm");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const alert = useCallback((msg: string, opts: { title?: string } = {}) => {
    setTitle(opts.title || "Hinweis");
    setDescription(msg);
    setMode("alert");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleAction = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleCancel]);

  const ConfirmDialog = useCallback(() => {
    return createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`glass-card w-full max-w-sm !p-0 overflow-hidden shadow-2xl ${
                mode === "confirm"
                  ? "!border-red-500/20"
                  : "!border-primary/20"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 text-center">
                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto ${
                    mode === "confirm"
                      ? "bg-red-500/10"
                      : "bg-primary/10"
                  }`}
                >
                  {mode === "confirm" ? (
                    <AlertTriangle size={32} className="text-red-500" />
                  ) : (
                    <Info size={32} className="text-primary" />
                  )}
                </div>

                {/* Title */}
                <h3 className="font-unbounded text-lg font-black text-white uppercase tracking-tight italic mb-2">
                  {title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-400 leading-relaxed mb-8">
                  {description}
                </p>

                {/* Buttons */}
                {mode === "confirm" ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleAction}
                      className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      Bestätigen
                    </button>
                    <button
                      onClick={handleCancel}
                      className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAction}
                    className="w-full bg-primary text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/80 transition-all"
                  >
                    Verstanden
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }, [open, title, description, mode, handleAction, handleCancel]);

  return { confirm, alert, ConfirmDialog };
}

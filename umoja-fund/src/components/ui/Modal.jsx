import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/40 p-3 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white p-5 shadow-xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-lg font-medium">{title}</p>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

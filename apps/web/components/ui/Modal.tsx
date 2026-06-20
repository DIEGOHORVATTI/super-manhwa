"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/Icon";

type Size = "sm" | "md" | "lg";

/**
 * Generic modal dialog. Portals to <body> (the header's backdrop-filter would
 * otherwise anchor a fixed overlay to it), closes on overlay click / ✕ / Escape,
 * and renders whatever children you pass. `title` is the accessible label; `size`
 * caps the width (sm/md/lg).
 */
export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: Size;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    // oxlint-disable-next-line click-events-have-key-events -- overlay close mirrors the Esc handler
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

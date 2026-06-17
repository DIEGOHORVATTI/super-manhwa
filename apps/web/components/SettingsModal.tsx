"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/Icon";
import { SettingsView } from "@/components/SettingsView";

/**
 * Account settings as a modal (no dedicated page). Controlled | the trigger lives
 * wherever it's used (profile "Editar perfil", account menu "Configurações").
 * Closes on overlay click, the ✕, or Escape.
 */
export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Portal to <body> | the header has a transform/backdrop-filter, which would
  // otherwise make this fixed overlay anchor to the header instead of the viewport.
  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay close mirrors the Esc handler above
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
        <div className="modal-body">
          <SettingsView />
        </div>
      </div>
    </div>,
    document.body,
  );
}

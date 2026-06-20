"use client";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { SettingsView } from "@/components/SettingsView";
import { Modal } from "@/components/ui/Modal";

/** "Editar perfil" trigger on the profile page | opens settings in a modal. */
export function EditProfileButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        <Icon name="pen-line" size={14} /> Editar perfil
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Configurações" size="md">
        <SettingsView />
      </Modal>
    </>
  );
}

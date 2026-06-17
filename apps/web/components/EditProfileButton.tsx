"use client";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { SettingsModal } from "@/components/SettingsModal";

/** "Editar perfil" trigger on the profile page | opens the settings modal. */
export function EditProfileButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        <Icon name="pen-line" size={14} /> Editar perfil
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

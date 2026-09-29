"use client";

import InstallMobileRoundedIcon from "@mui/icons-material/InstallMobileRounded";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useBoolean } from "minimal-shared/hooks";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/mui/BottomSheet";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

function isInstalled() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * "Instalar app" on phones (touch screens) while the site isn't installed yet.
 * Chrome/Samsung hand us the native install prompt; browsers without it (Safari,
 * Firefox) get the menu steps in a bottom sheet instead.
 */
export function InstallAppButton() {
  const [visible, setVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const help = useBoolean();

  useEffect(() => {
    setVisible(matchMedia("(pointer: coarse)").matches && !isInstalled());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const install = async () => {
    if (!installPrompt) return help.onTrue();
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <>
      <Tooltip title="Instalar app">
        <IconButton onClick={install} aria-label="Instalar app">
          <InstallMobileRoundedIcon />
        </IconButton>
      </Tooltip>

      <BottomSheet open={help.value} onClose={help.onFalse} title="Instalar o Super Novel">
        <Typography component="ol" sx={{ pl: 2.5, pb: 2, "& li": { mb: 1 } }}>
          {ios ? (
            <>
              <li>Toque no botão Compartilhar do Safari (o quadrado com a seta para cima).</li>
              <li>Escolha &quot;Adicionar à Tela de Início&quot;.</li>
            </>
          ) : (
            <>
              <li>Toque no menu do navegador (⋮).</li>
              <li>Escolha &quot;Instalar app&quot; ou &quot;Adicionar à tela inicial&quot;.</li>
            </>
          )}
          <li>O Super Novel abre em tela cheia, com ícone próprio, como um app.</li>
        </Typography>
      </BottomSheet>
    </>
  );
}

"use client";

import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";

/** Dark ↔ sepia ("Kindle paper") switch; the choice persists in localStorage. */
export function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  if (!mode) return <IconButton aria-hidden disabled sx={{ width: 40, height: 40 }} />;

  const isDark = (mode === "system" ? systemMode : mode) === "dark";
  const label = isDark ? "Tema claro (papel)" : "Tema escuro";

  return (
    <Tooltip title={label}>
      <IconButton onClick={() => setMode(isDark ? "light" : "dark")} aria-label={label}>
        {isDark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
      </IconButton>
    </Tooltip>
  );
}

"use client";

import Button from "@mui/material/Button";
import { useEffect, useState } from "react";

import { env } from "@/lib/env";

const KEY = "sm-no-analytics";

/** Turns Google Analytics off (or back on) in this browser; read by FirebaseAnalytics. */
export function AnalyticsOptOut() {
  const [optedOut, setOptedOut] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setOptedOut(localStorage.getItem(KEY) === "1");
    } catch {
      setOptedOut(false);
    }
  }, []);

  if (optedOut === null) return null;

  const toggle = () => {
    const next = !optedOut;
    try {
      if (next) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {}
    const id = env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    if (id) (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = next;
    setOptedOut(next);
  };

  return (
    <Button variant="outlined" onClick={toggle}>
      {optedOut ? "Reativar o Google Analytics" : "Desativar o Google Analytics neste navegador"}
    </Button>
  );
}

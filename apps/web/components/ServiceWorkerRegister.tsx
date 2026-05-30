"use client";
import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js) once, in the browser, in
 * production only — dev caching would just get in the way. Renders nothing.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

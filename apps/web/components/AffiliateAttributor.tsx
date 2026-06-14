"use client";
import { useEffect, useRef } from "react";

import { useSession } from "@/lib/auth/client";

/**
 * Fires affiliate attribution once after a user is authenticated (covers email +
 * Google sign-in). The server route reads the httpOnly `ref` cookie and is
 * idempotent, so a no-op when there's no referral. Runs once per page load.
 */
export function AffiliateAttributor() {
  const { data } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !data?.user) return;
    done.current = true;
    void fetch("/api/affiliate/attribute", { method: "POST" }).catch(() => {});
  }, [data?.user]);

  return null;
}

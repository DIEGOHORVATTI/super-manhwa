"use client";
import { useEffect, useState } from "react";

import { fetchEmojiMap } from "@/lib/emoji-client";

/** Resolve a custom emote name (`:name:`) to its image URL on the client. */
export function useEmoteUrl(name: string | null | undefined): string | undefined {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    void fetchEmojiMap().then(setMap);
  }, []);
  return name ? map[name] : undefined;
}

"use client";
import { useEffect, useState } from "react";

import { fetchEmojiMap } from "@/lib/emoji-client";
import { parseBody } from "@/lib/emojis";

/** Renders a text string with :name: tokens replaced by inline emoji images. */
export function EmojiText({ text, className }: { text: string; className?: string }) {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchEmojiMap().then(setMap);
  }, []);

  const segs = parseBody(text, map);

  return (
    <span className={className}>
      {segs.map((s, i) =>
        typeof s === "string" ? (
          s
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={s.url}
            alt={`:${s.name}:`}
            title={`:${s.name}:`}
            className="comment-emoji"
          />
        ),
      )}
    </span>
  );
}

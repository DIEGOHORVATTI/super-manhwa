"use client";
import { useEffect, useState } from "react";

// Shown above the chapter skeleton while the cross-source fan-out streams in.
// The first visit to a work is cold (no cache) and noticeably slower; these
// rotating, reassuring lines explain the wait and that it pays off for everyone
// after. On cached visits Suspense resolves fast, so this barely flashes.
const MESSAGES = [
  "Buscando capítulos em várias fontes…",
  "Primeira vez nessa obra? A busca inicial leva um pouquinho a mais.",
  "Depois dela, você e os próximos leitores têm acesso instantâneo. Valeu pela paciência! 🙏",
];

export function ChapterLoadingNote() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 2800);
    return () => clearInterval(t);
  }, []);
  // `key` re-mounts the node each change so the fade-in animation re-runs.
  return (
    <p key={i} className="chapters-loading-note">
      {MESSAGES[i]}
    </p>
  );
}

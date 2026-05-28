"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * The ONLY filter the frontend exposes. No source/platform selector — the wire
 * is source-agnostic; users filter by language of the work, not by integration.
 * Preserves any sibling search params (sort, etc.) when navigating.
 */
export function LangFilter({ langs, lang }: { langs: string[]; lang: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  if (langs.length <= 1) return null;

  return (
    <select
      className="select"
      value={lang}
      onChange={(e) => {
        const sp = new URLSearchParams(params);
        if (e.target.value) sp.set("lang", e.target.value); else sp.delete("lang");
        const qs = sp.toString();
        startTransition(() => router.push(qs ? `/?${qs}` : "/"));
      }}
    >
      <option value="">todos idiomas</option>
      {langs.map((l) => <option key={l} value={l}>{l}</option>)}
    </select>
  );
}

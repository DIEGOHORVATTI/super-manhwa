"use client";
import type { MangaSummary } from "@packages/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { PosterGrid } from "@/components/PosterGrid";

/**
 * Infinite-scroll listing. SSR renders the first page (SEO + fast paint) and
 * hands it here as `initial`; an IntersectionObserver loads the next page from
 * `/api/list` as the sentinel nears the viewport, appending de-duped items. The
 * URL `?page=` is kept in sync (shareable + back button), and a "Carregar mais"
 * button is the no-JS / accessible fallback.
 */
export function InfiniteList({
  initial,
  initialPage,
  hasNextPage,
  params,
}: {
  initial: MangaSummary[];
  initialPage: number;
  hasNextPage: boolean;
  params: Record<string, string>; // feed/q/genre/status/sort (no page)
}) {
  const [items, setItems] = useState<MangaSummary[]>(initial);
  const [page, setPage] = useState(initialPage);
  const [more, setMore] = useState(hasNextPage);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (loading || !more) return;
    setLoading(true);
    try {
      const next = page + 1;
      const sp = new URLSearchParams({ ...params, page: String(next) });
      const res = await fetch(`/api/list?${sp.toString()}`).then((r) => r.json());
      const incoming: MangaSummary[] = res.list ?? [];
      setItems((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      });
      setPage(next);
      setMore(Boolean(res.hasNextPage));
      // Keep the URL shareable without a navigation.
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(next));
      window.history.replaceState(null, "", url);
    } finally {
      setLoading(false);
    }
  }, [loading, more, page, params]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void load();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load, more]);

  return (
    <>
      <PosterGrid items={items} />
      {more && (
        <div className="infinite-foot">
          <div ref={sentinel} aria-hidden="true" />
          <button type="button" className="pager-btn" onClick={load} disabled={loading}>
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </>
  );
}

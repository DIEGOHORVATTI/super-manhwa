"use client";
import type { MangaSummary } from "@packages/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { PosterGrid } from "@/components/PosterGrid";
import { routes } from "@/lib/routes";

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
  banner,
}: {
  initial: MangaSummary[];
  initialPage: number;
  hasNextPage: boolean;
  params: Record<string, string>; // feed/q/genre/status/sort (no page)
  banner?: React.ReactNode; // optional grid-cell banner (e.g. Discord CTA on the landing)
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
      const res = await fetch(`${routes.api.list}?${sp.toString()}`).then((r) => r.json());
      const incoming: MangaSummary[] = res.list ?? [];
      setItems((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      });
      setPage(next);
      setMore(Boolean(res.hasNextPage));
      // ponytail: não escrevemos ?page= na URL — infinite scroll não precisa,
      // e o param poluía o link compartilhado. A 1ª página vem do SSR.
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
      <PosterGrid items={items} banner={banner} />
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

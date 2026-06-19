"use client";
import type { MangaSummary } from "@packages/contracts";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { rpc } from "@/lib/rpc/client";

type Cached = Awaited<ReturnType<typeof rpc.admin.cache.list>>["items"][number];
type Browse = "popular" | "trending" | "newest";

const BROWSE: { key: Browse; label: string }[] = [
  { key: "trending", label: "Em altas" },
  { key: "popular", label: "Populares" },
  { key: "newest", label: "Recentes" },
];

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Run `fn` over items with a small concurrency cap, reporting progress. */
async function pool<T>(items: T[], n: number, fn: (it: T) => Promise<void>, onTick: () => void) {
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const it = items[i++];
      await fn(it).catch(() => {});
      onTick();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

/**
 * Cache console | search/browse the catalog and pre-warm works into our DB+R2,
 * plus a list of what's already cached and when. Warming runs the same write the
 * detail page does on first view, so the first public hit is instant.
 */
export function AdminCache() {
  const [browse, setBrowse] = useState<Browse>("trending");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MangaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState<Cached[]>([]);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [warming, setWarming] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  const loadCached = useCallback(async () => {
    try {
      const { items } = await rpc.admin.cache.list();
      setCached(items);
      setCachedIds(new Set(items.map((i) => i.id)));
    } catch {
      setCached([]);
    }
  }, []);

  useEffect(() => {
    void loadCached();
  }, [loadCached]);

  // Search (q≥2) or browse by sort | reuses the public catalog proxy.
  useEffect(() => {
    const Q = q.trim();
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(
      async () => {
        try {
          const params = new URLSearchParams(Q.length >= 2 ? { q: Q } : { sort: browse });
          const r = await fetch(`/api/list?${params}`, { signal: ctrl.signal });
          const data = (await r.json()) as { list: MangaSummary[] };
          setResults(data.list ?? []);
        } catch (e) {
          if ((e as Error).name !== "AbortError") setResults([]);
        } finally {
          setLoading(false);
        }
      },
      Q ? 300 : 0,
    );
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, browse]);

  const warmOne = useCallback(async (it: MangaSummary) => {
    setWarming((s) => new Set(s).add(it.id));
    try {
      await rpc.admin.cache.warm({ id: it.id, name: it.name });
      setCachedIds((s) => new Set(s).add(it.id));
    } finally {
      setWarming((s) => {
        const next = new Set(s);
        next.delete(it.id);
        return next;
      });
    }
  }, []);

  const warmAll = useCallback(async () => {
    const todo = results.filter((r) => !cachedIds.has(r.id));
    if (todo.length === 0) return;
    setBulk({ done: 0, total: todo.length });
    await pool(
      todo,
      3,
      (it) => warmOne(it),
      () => setBulk((b) => (b ? { ...b, done: b.done + 1 } : b)),
    );
    setBulk(null);
    void loadCached();
  }, [results, cachedIds, warmOne, loadCached]);

  const pending = results.filter((r) => !cachedIds.has(r.id)).length;

  return (
    <>
      <div className="settings-title-row">
        <h1 className="settings-title">Cache do catálogo</h1>
        <button type="button" className="btn btn-ghost" onClick={() => void loadCached()}>
          Atualizar
        </button>
      </div>
      <p className="muted" style={{ marginTop: -4 }}>
        Busque ou navegue por um termo e pré-aqueça as obras (metadados, capa e capítulos) no nosso
        banco. Abaixo, o que já está em cache e quando.
      </p>

      {/* Search + browse */}
      <div className="cache-toolbar">
        <div className="combobox-input cache-search">
          <Icon className="combobox-icon" name="search" size={16} />
          <input
            className="combobox-field"
            value={q}
            placeholder="Buscar por título…"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="cache-tabs">
          {BROWSE.map((b) => (
            <button
              type="button"
              key={b.key}
              className={`format-tab${!q && browse === b.key ? " is-active" : ""}`}
              onClick={() => {
                setQ("");
                setBrowse(b.key);
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-title-row" style={{ marginTop: 18 }}>
        <h2 className="section" style={{ margin: 0 }}>
          {q.trim().length >= 2
            ? `Resultados (${results.length})`
            : BROWSE.find((b) => b.key === browse)?.label}
        </h2>
        {pending > 0 && (
          <button type="button" className="btn" onClick={() => void warmAll()} disabled={!!bulk}>
            {bulk ? `Cacheando ${bulk.done}/${bulk.total}…` : `Cachear todos (${pending})`}
          </button>
        )}
      </div>

      {loading && results.length === 0 ? (
        <p className="muted">Carregando…</p>
      ) : (
        <div className="admin-table">
          {results.map((it) => {
            const isCached = cachedIds.has(it.id);
            const isWarming = warming.has(it.id);
            return (
              <div key={it.id} className="admin-row cache-row">
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="cache-thumb" src={it.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className="cache-thumb cache-thumb-empty" />
                )}
                <div className="admin-row-main">
                  <strong>{it.name}</strong>
                  <span className="muted">{isCached ? "em cache" : "não cacheado"}</span>
                </div>
                <button
                  type="button"
                  className={`btn${isCached ? " btn-ghost" : ""}`}
                  disabled={isWarming || !!bulk}
                  onClick={() => void warmOne(it).then(() => loadCached())}
                >
                  {isWarming ? "Cacheando…" : isCached ? "Recachear" : "Cachear"}
                </button>
              </div>
            );
          })}
          {results.length === 0 && <p className="muted">Nada encontrado.</p>}
        </div>
      )}

      {/* Already cached */}
      <h2 className="section" style={{ marginTop: 28 }}>
        Já em cache ({cached.length})
      </h2>
      <div className="admin-table">
        {cached.map((c) => (
          <div key={c.id} className="admin-row cache-row">
            {c.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="cache-thumb" src={c.coverUrl} alt="" loading="lazy" />
            ) : (
              <span className="cache-thumb cache-thumb-empty" />
            )}
            <div className="admin-row-main">
              <strong>{c.title}</strong>
              <span className="muted">
                {c.chapters} caps · {fmtDate(c.refreshedAt)}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={warming.has(c.id)}
              onClick={() =>
                void warmOne({ id: c.id, name: c.title, lang: "" }).then(() => loadCached())
              }
            >
              {warming.has(c.id) ? "…" : "Recachear"}
            </button>
          </div>
        ))}
        {cached.length === 0 && <p className="muted">Nenhuma obra em cache ainda.</p>}
      </div>
    </>
  );
}

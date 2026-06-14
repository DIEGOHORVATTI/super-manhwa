"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PremiumBanner } from "@/components/PremiumBanner";
import { useSession } from "@/lib/auth/client";

interface Tok {
  idx: number;
  sentenceIdx: number;
  surface: string;
  lemma: string | null;
  isWord: boolean;
}
type Status = "new" | "learning" | "known" | "ignored";

/**
 * Interactive novel reader. Every word is clickable and coloured by the reader's
 * per-word status (blue = new, yellow = learning, none = known/ignored). Clicking
 * opens a popup with the word, its sentence as a live example, and status
 * buttons. A "known words" counter rises as you study — the LingQ retention hook.
 */
export function NovelReader({ chapterId }: { chapterId: number }) {
  const { data: session } = useSession();
  const [data, setData] = useState<{
    title: string;
    language: string;
    tokens: Tok[];
    statuses: Record<string, Status>;
    counts: { known: number; learning: number };
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Tok | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/learn/chapters/${chapterId}`);
    if (res.ok) setData(await res.json());
    else setErr("Capítulo indisponível.");
  }, [chapterId]);
  useEffect(() => {
    void load();
  }, [load]);

  const statusOf = useCallback(
    (t: Tok): Status => (t.lemma && data?.statuses[t.lemma]) || "new",
    [data],
  );

  // Reconstruct the sentence around the selected token (live example).
  const example = useMemo(() => {
    if (!sel || !data) return "";
    return data.tokens
      .filter((t) => t.sentenceIdx === sel.sentenceIdx)
      .map((t) => t.surface)
      .join("")
      .trim();
  }, [sel, data]);

  if (err) return <p className="muted studio-wrap">{err}</p>;
  if (!data) return <p className="muted studio-wrap">Carregando…</p>;

  async function setStatus(lemma: string, status: Status) {
    if (!session?.user) return;
    setLimitMsg(null);
    const res = await fetch("/api/learn/words", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: data!.language, lemma, status }),
    });
    if (res.status === 402) {
      const j = await res.json().catch(() => ({}));
      setLimitMsg(j.message ?? "Limite diário atingido.");
      return;
    }
    if (res.ok) {
      // optimistic local update + recount
      setData((d) => {
        if (!d) return d;
        const statuses = { ...d.statuses, [lemma]: status };
        let known = 0;
        let learning = 0;
        for (const s of Object.values(statuses)) {
          if (s === "known") known++;
          else if (s === "learning") learning++;
        }
        return { ...d, statuses, counts: { known, learning } };
      });
    }
  }

  return (
    <div className="novel-reader">
      <header className="novel-head">
        <Link href="/" className="comment-link">
          ← Início
        </Link>
        <h1>{data.title}</h1>
        <div className="novel-counters">
          <span className="novel-chip novel-chip-known">{data.counts.known} conhecidas</span>
          <span className="novel-chip novel-chip-learning">{data.counts.learning} aprendendo</span>
        </div>
      </header>

      {!session?.user && (
        <p className="comment-signin">
          <Link href="/login">Entre</Link> para marcar palavras e salvar seu progresso.
        </p>
      )}

      <article className="novel-text">
        {data.tokens.map((t) =>
          t.isWord ? (
            <span
              key={t.idx}
              className={`w w-${statusOf(t)}`}
              onClick={() => setSel(t)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSel(t)}
            >
              {t.surface}
            </span>
          ) : (
            <span key={t.idx}>{t.surface}</span>
          ),
        )}
      </article>

      {sel?.lemma && (
        <div className="novel-popup" role="dialog">
          <button type="button" className="novel-popup-close" onClick={() => setSel(null)}>
            ✕
          </button>
          <div className="novel-popup-word">{sel.surface}</div>
          <div className="novel-popup-lemma">
            lema: <strong>{sel.lemma}</strong> · {data.language.toUpperCase()}
          </div>
          <p className="novel-popup-example">{example}</p>
          <p className="muted" style={{ fontSize: 12 }}>
            Tradução do dicionário será exibida quando o dicionário do idioma estiver carregado.
          </p>
          {session?.user ? (
            <>
              <div className="novel-popup-actions">
                {(["learning", "known", "ignored"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`novel-status-btn ${statusOf(sel) === s ? "is-active" : ""}`}
                    onClick={() => setStatus(sel.lemma!, s)}
                  >
                    {s === "learning" ? "Aprendendo" : s === "known" ? "Conheço" : "Ignorar"}
                  </button>
                ))}
              </div>
              {limitMsg && (
                <>
                  <p className="auth-error">{limitMsg}</p>
                  <PremiumBanner compact />
                </>
              )}
            </>
          ) : (
            <Link href="/login" className="novel-status-btn">
              Entrar para salvar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

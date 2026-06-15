"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/client";
import { rpc } from "@/lib/rpc/client";

interface Stats {
  xp: number;
  streakDays: number;
  dailyGoal: number;
  plan: "free" | "premium";
  counts: { known: number; learning: number };
  today: { newWords: number; reviews: number };
  dueCount: number;
  achievements: string[];
  entitlements: { premium: boolean; newWordsRemaining: number | null; canExportAnki: boolean };
}

const ACHIEVEMENT_LABELS: Record<string, string> = {
  words_100: "100 palavras",
  words_1000: "1.000 palavras",
  streak_7: "7 dias seguidos",
  streak_30: "30 dias seguidos",
  first_chapter: "Primeiro capítulo",
};

/** Learning home: streak, daily goal, vocab counts, due reviews and plan. */
export function LearnDashboard() {
  const { data: session, isPending } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!session) return;
    rpc.learn
      .stats()
      .then((s) => setStats(s as Stats))
      .catch(() => setStats(null));
  }, [session]);

  if (isPending) return <p className="muted studio-wrap">Carregando…</p>;
  if (!session?.user) {
    return (
      <div className="studio-wrap">
        <p className="muted">
          <Link href="/login">Entre</Link> para aprender idiomas lendo novels.
        </p>
      </div>
    );
  }
  if (!stats) return <p className="muted studio-wrap">Carregando progresso…</p>;

  const goalPct = Math.min(100, Math.round((stats.today.newWords / stats.dailyGoal) * 100));

  return (
    <div className="studio-wrap">
      <div className="learn-top">
        <h1 className="settings-title" style={{ margin: 0 }}>
          Aprender
        </h1>
        <span className={`status-badge ${stats.plan === "premium" ? "status-published" : ""}`}>
          {stats.plan === "premium" ? "Premium" : "Grátis"}
        </span>
      </div>

      <div className="learn-stats">
        <div className="learn-stat">
          <strong>🔥 {stats.streakDays}</strong>
          <span>streak</span>
        </div>
        <div className="learn-stat">
          <strong>{stats.xp}</strong>
          <span>XP</span>
        </div>
        <div className="learn-stat">
          <strong>{stats.counts.known}</strong>
          <span>conhecidas</span>
        </div>
        <div className="learn-stat">
          <strong>{stats.counts.learning}</strong>
          <span>aprendendo</span>
        </div>
      </div>

      <section className="settings-card">
        <h2>Meta diária</h2>
        <div className="learn-goal-bar">
          <div className="learn-goal-fill" style={{ width: `${goalPct}%` }} />
        </div>
        <p className="muted">
          {stats.today.newWords}/{stats.dailyGoal} palavras novas hoje · {stats.today.reviews}{" "}
          revisões
          {stats.entitlements.newWordsRemaining != null && (
            <> · restam {stats.entitlements.newWordsRemaining} hoje (grátis)</>
          )}
        </p>
      </section>

      <section className="settings-card">
        <h2>Revisão</h2>
        <p className="muted">{stats.dueCount} cards prontos para revisar.</p>
        <Link href="/learn/review" className="auth-submit" style={{ alignSelf: "flex-start" }}>
          Revisar agora
        </Link>
      </section>

      <section className="settings-card">
        <h2>Conquistas</h2>
        {stats.achievements.length === 0 ? (
          <p className="muted">Nenhuma ainda | comece a ler!</p>
        ) : (
          <div className="learn-badges">
            {stats.achievements.map((a) => (
              <span key={a} className="novel-chip novel-chip-known">
                {ACHIEVEMENT_LABELS[a] ?? a}
              </span>
            ))}
          </div>
        )}
      </section>

      {stats.entitlements.canExportAnki && (
        <section className="settings-card">
          <h2>Ferramentas Premium</h2>
          <a href="/api/learn/export" className="auth-google" style={{ alignSelf: "flex-start" }}>
            Exportar cards pro Anki (.tsv)
          </a>
        </section>
      )}

      {stats.plan !== "premium" && (
        <section className="settings-card">
          <h2>Premium</h2>
          <p className="muted">
            Palavras e cards ilimitados, sentence mining, estatísticas e export pro Anki.
          </p>
          <Link href="/learn/premium" className="auth-submit" style={{ alignSelf: "flex-start" }}>
            Assinar Premium
          </Link>
        </section>
      )}
    </div>
  );
}

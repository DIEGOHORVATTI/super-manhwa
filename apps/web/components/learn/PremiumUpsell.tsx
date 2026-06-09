"use client";
import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { useSession } from "@/lib/auth/client";

const PERKS = [
  "Palavras novas e cards ilimitados",
  "Sentence mining (minerar frases)",
  "Estatísticas avançadas de aprendizado",
  "Export pro Anki (.tsv)",
  "Sem anúncios",
];

/** Premium upsell + subscribe (Mercado Pago checkout redirect). */
export function PremiumUpsell() {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/learn/subscribe", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.error === "unconfigured"
            ? "Assinatura ainda não configurada."
            : "Erro ao iniciar a assinatura.",
        );
      }
      const data = await res.json();
      if (data.initPoint) window.location.href = data.initPoint;
      else throw new Error("Checkout indisponível.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  return (
    <div className="donate-wrap">
      <h1 className="donate-title">Super Manhwa Premium</h1>
      <p className="donate-sub">Aprenda sem limites enquanto lê suas novels favoritas.</p>

      <div className="settings-card">
        <ul className="premium-perks">
          {PERKS.map((p) => (
            <li key={p}>
              <Icon name="circle-check-big" size={18} /> {p}
            </li>
          ))}
        </ul>
        {error && <p className="auth-error">{error}</p>}
        {session?.user ? (
          <button type="button" className="auth-submit" onClick={subscribe} disabled={busy}>
            {busy ? "Redirecionando…" : "Assinar via Pix/cartão"}
          </button>
        ) : (
          <Link href="/login" className="auth-submit" style={{ alignSelf: "flex-start" }}>
            Entrar para assinar
          </Link>
        )}
      </div>
    </div>
  );
}

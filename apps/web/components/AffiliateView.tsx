"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/client";
import { rpc } from "@/lib/rpc/client";

interface Data {
  affiliate: { code: string; ratePct: number; pixKey: string | null } | null;
  stats?: { referrals: number; pendingCents: number; paidCents: number };
}

const brl = (cents: number) => `R$${(cents / 100).toFixed(2)}`;

/**
 * Affiliate dashboard: join the program, copy the referral link, set the payout
 * Pix key, and see referral count + pending/paid commission.
 */
export function AffiliateView() {
  const { data: session, isPending } = useSession();
  const [data, setData] = useState<Data | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const d: Data = await rpc.affiliate.get();
      setData(d);
      setPixKey(d.affiliate?.pixKey ?? "");
    } catch {
      // leave dashboard in its loading state on failure
    }
  };
  useEffect(() => {
    if (session) void load();
  }, [session]);

  if (isPending) return <p className="muted studio-wrap">Carregando…</p>;
  if (!session?.user) {
    return (
      <div className="studio-wrap">
        <p className="muted">
          <Link href="/login">Entre</Link> para participar do programa de afiliados.
        </p>
      </div>
    );
  }
  if (!data) return <p className="muted studio-wrap">Carregando…</p>;

  async function join() {
    setBusy(true);
    try {
      await rpc.affiliate.upsertPixKey({});
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function savePix() {
    setSavedMsg(null);
    await rpc.affiliate.upsertPixKey({ pixKey });
    setSavedMsg("Chave Pix salva.");
  }

  const link =
    data.affiliate && typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${data.affiliate.code}`
      : "";

  return (
    <div className="studio-wrap">
      <h1 className="settings-title">Programa de afiliados</h1>

      {!data.affiliate ? (
        <section className="settings-card">
          <h2>Ganhe indicando</h2>
          <p className="muted">
            Compartilhe seu link. Quem assinar o Premium pelo seu link te dá{" "}
            <strong>20% da assinatura todo mês</strong>, enquanto a assinatura durar.
          </p>
          <button type="button" className="auth-submit" onClick={join} disabled={busy}>
            {busy ? "Gerando…" : "Quero meu link"}
          </button>
        </section>
      ) : (
        <>
          <div className="learn-stats">
            <div className="learn-stat">
              <strong>{data.stats?.referrals ?? 0}</strong>
              <span>indicados</span>
            </div>
            <div className="learn-stat">
              <strong>{brl(data.stats?.pendingCents ?? 0)}</strong>
              <span>a receber</span>
            </div>
            <div className="learn-stat">
              <strong>{brl(data.stats?.paidCents ?? 0)}</strong>
              <span>já pago</span>
            </div>
            <div className="learn-stat">
              <strong>{data.affiliate.ratePct}%</strong>
              <span>comissão</span>
            </div>
          </div>

          <section className="settings-card">
            <h2>Seu link</h2>
            <div className="affiliate-link">
              <code>{link}</code>
              <button
                type="button"
                className="auth-submit"
                onClick={() => {
                  void navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </section>

          <section className="settings-card">
            <h2>Chave Pix (para receber)</h2>
            <label className="auth-field">
              <span>Chave Pix</span>
              <input
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="e-mail, CPF, telefone ou aleatória"
              />
            </label>
            {savedMsg && <p className="auth-notice">{savedMsg}</p>}
            <button type="button" className="auth-submit" onClick={savePix}>
              Salvar chave Pix
            </button>
          </section>
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { SideRays } from "@/components/SideRays";
import { rpc } from "@/lib/rpc/client";

/**
 * Pix donation flow. Pick an amount → create a Mercado Pago Pix payment → show
 * the QR + copy-paste code → poll until the webhook marks it approved.
 */
const PRESETS = [500, 1000, 2500, 5000]; // cents

type Stage = "form" | "pix" | "done";

export function DonateView() {
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<{ id: number; qrCode: string; qrCodeBase64: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cents = custom ? Math.round(Number(custom) * 100) : amount;

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function start() {
    setError(null);
    if (!cents || cents < 100) {
      setError("Valor mínimo: R$1,00.");
      return;
    }
    setBusy(true);
    try {
      const data = await rpc.donations.create({
        amountCents: cents,
        message: message || undefined,
      });
      if (!data.qrCode) throw new Error("Pix indisponível no momento.");
      setPix({ id: data.id, qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64 ?? "" });
      setStage("pix");
      pollRef.current = setInterval(async () => {
        const s = await rpc.donations.status({ id: String(data.id) });
        if (s.status === "approved") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStage("done");
        }
      }, 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar o Pix.");
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (!pix) return;
    void navigator.clipboard.writeText(pix.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="donate-wrap">
      <div className="donate-bg" style={{ backgroundImage: "url(/banner_1500x500.jpeg)" }} />
      <SideRays
        speed={2.5}
        rayColor1="#EAB308"
        rayColor2="#96c8ff"
        intensity={2}
        spread={2}
        origin="top-right"
        tilt={0}
        saturation={1.5}
        blend={0.75}
        falloff={1.6}
        opacity={1}
      />
      <div className="donate-content">
        <header className="donate-head">
          <h1 className="donate-title">Apoie a Super Manhwa</h1>
          <p className="donate-sub">
            Sua doação via Pix ajuda a manter os servidores e o catálogo no ar. Cada real conta —
            obrigado por fazer parte. 💜
          </p>
        </header>

        {stage === "form" && (
          <div className="settings-card">
            <div className="donate-presets">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`donate-preset${!custom && amount === p ? " is-active" : ""}`}
                  onClick={() => {
                    setAmount(p);
                    setCustom("");
                  }}
                >
                  R${(p / 100).toFixed(0)}
                </button>
              ))}
            </div>
            <label className="auth-field">
              <span>Outro valor (R$)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Ex.: 15"
              />
            </label>
            <label className="auth-field">
              <span>Mensagem (opcional)</span>
              <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="button" className="auth-submit" onClick={start} disabled={busy}>
              {busy ? "Gerando Pix…" : `Doar R$${(cents / 100).toFixed(2)}`}
            </button>
          </div>
        )}

        {stage === "pix" && pix && (
          <div className="settings-card donate-pix">
            <p className="muted">Escaneie o QR Code no app do seu banco ou copie o código Pix:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="donate-qr"
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code Pix"
            />
            <button type="button" className="auth-google" onClick={copyCode}>
              <Icon name="download" size={16} /> {copied ? "Copiado!" : "Copiar código Pix"}
            </button>
            <p className="donate-waiting">
              <span className="donate-spinner" /> Aguardando confirmação do pagamento…
            </p>
          </div>
        )}

        {stage === "done" && (
          <div className="settings-card donate-done">
            <Icon name="circle-check-big" size={48} />
            <h2>Doação confirmada!</h2>
            <p className="muted">Muito obrigado pelo seu apoio. 💜</p>
          </div>
        )}
      </div>
    </div>
  );
}

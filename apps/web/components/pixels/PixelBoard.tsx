"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/lib/auth/client";
import { GRID, isFree, isValidRect, priceCents, type Rect, toPixelBox } from "@/lib/pixels";
import { rpc } from "@/lib/rpc/client";

interface Ad {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
}

const brl = (cents: number) => `R$${(cents / 100).toFixed(2)}`;
type Stage = "browse" | "form" | "pay" | "done";

/**
 * The "million pixel" board: pick a size, click a free spot, fill in image+link,
 * pay via Pix (Mercado Pago). Approved ads render as clickable images. Selection
 * collision + pricing reuse the pure lib/pixels helpers.
 */
export function PixelBoard() {
  const { data: session } = useSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [taken, setTaken] = useState<Rect[]>([]);
  const [size, setSize] = useState({ w: 5, h: 5 });
  const [sel, setSel] = useState<Rect | null>(null);
  const [stage, setStage] = useState<Stage>("browse");
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pix, setPix] = useState<{ id: number; qrCode: string; qrCodeBase64: string } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const d = await rpc.pixels.grid();
      setAds(d.ads ?? []);
      setTaken(d.taken ?? []);
    } catch {
      /* leave previous state */
    }
  };
  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function onBoardClick(e: React.MouseEvent) {
    if (stage === "pay" || stage === "done") return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor((e.clientX - rect.left) / GRID.blockPx);
    const y = Math.floor((e.clientY - rect.top) / GRID.blockPx);
    const candidate: Rect = {
      x: Math.min(x, GRID.cols - size.w),
      y: Math.min(y, GRID.rows - size.h),
      w: size.w,
      h: size.h,
    };
    if (!isValidRect(candidate) || !isFree(candidate, taken)) {
      setErr("Esse espaço está ocupado ou inválido. Escolha outro.");
      setSel(null);
      return;
    }
    setErr(null);
    setSel(candidate);
    setStage("form");
  }

  async function submit() {
    if (!sel || !file || !/^https?:\/\/.+/i.test(link)) {
      setErr("Preencha o link (http...) e a imagem.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const data = await rpc.pixels.reserve({
        x: sel.x,
        y: sel.y,
        w: sel.w,
        h: sel.h,
        linkUrl: link,
        title,
        image: file,
      });
      setPix({ id: data.id, qrCode: data.qrCode ?? "", qrCodeBase64: data.qrCodeBase64 ?? "" });
      setStage("pay");
      pollRef.current = setInterval(async () => {
        try {
          const s = await rpc.pixels.status({ id: String(data.id) });
          if (s.status === "pending" || s.status === "approved") {
            if (pollRef.current) clearInterval(pollRef.current);
            setStage("done");
            void load();
          }
        } catch {
          /* keep polling */
        }
      }, 4000);
    } catch (e) {
      const code = (e as { message?: string })?.message;
      setErr(code === "taken" ? "Alguém pegou esse espaço. Escolha outro." : "Falha ao reservar.");
    } finally {
      setBusy(false);
    }
  }

  const boardW = GRID.cols * GRID.blockPx;
  const boardH = GRID.rows * GRID.blockPx;

  return (
    <div className="pixels-wrap">
      <h1 className="donate-title">Eternize sua marca</h1>
      <p className="donate-sub">
        Compre um espaço na nossa grade de pixels. {brl(priceCents({ x: 0, y: 0, w: 1, h: 1 }))} por
        bloco de {GRID.blockPx}×{GRID.blockPx}px. Pague via Pix — fica para sempre.
      </p>

      {stage === "browse" && (
        <div className="pixels-controls">
          <label className="auth-field">
            <span>Largura (blocos)</span>
            <input
              type="number"
              min={1}
              max={20}
              value={size.w}
              onChange={(e) => setSize((s) => ({ ...s, w: Math.max(1, Number(e.target.value)) }))}
            />
          </label>
          <label className="auth-field">
            <span>Altura (blocos)</span>
            <input
              type="number"
              min={1}
              max={20}
              value={size.h}
              onChange={(e) => setSize((s) => ({ ...s, h: Math.max(1, Number(e.target.value)) }))}
            />
          </label>
          <div className="pixels-price">
            {brl(priceCents({ x: 0, y: 0, ...size }))} · clique num espaço livre
          </div>
        </div>
      )}

      {err && <p className="auth-error">{err}</p>}

      <div className="pixels-scroll">
        <div
          ref={boardRef}
          className="pixels-board"
          style={{ width: boardW, height: boardH }}
          onClick={onBoardClick}
        >
          {ads.map((a) => {
            const box = toPixelBox(a);
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.imageUrl} alt={a.title ?? ""} style={{ width: "100%", height: "100%" }} />
            );
            return (
              <div key={a.id} className="pixels-ad" style={box} title={a.title ?? undefined}>
                {a.linkUrl ? (
                  <a href={a.linkUrl} target="_blank" rel="sponsored nofollow noopener">
                    {img}
                  </a>
                ) : (
                  img
                )}
              </div>
            );
          })}
          {sel && <div className="pixels-sel" style={toPixelBox(sel)} />}
        </div>
      </div>

      {stage === "form" && sel && (
        <section className="settings-card pixels-form">
          <h2>
            Seu espaço {sel.w}×{sel.h} — {brl(priceCents(sel))}
          </h2>
          {!session?.user ? (
            <p className="muted">
              <Link href="/login">Entre</Link> para comprar.
            </p>
          ) : (
            <>
              <label className="auth-field">
                <span>Link (para onde leva)</span>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="auth-field">
                <span>Título (tooltip)</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
              </label>
              <label className="auth-field">
                <span>
                  Imagem ({sel.w * GRID.blockPx}×{sel.h * GRID.blockPx}px)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button type="button" className="auth-submit" onClick={submit} disabled={busy}>
                {busy ? "Gerando Pix…" : `Pagar ${brl(priceCents(sel))} via Pix`}
              </button>
              <button
                type="button"
                className="comment-link"
                onClick={() => {
                  setSel(null);
                  setStage("browse");
                }}
              >
                Cancelar
              </button>
            </>
          )}
        </section>
      )}

      {stage === "pay" && pix && (
        <section className="settings-card donate-pix">
          <p className="muted">Escaneie o QR ou copie o código Pix:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="donate-qr"
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Pix"
          />
          <button
            type="button"
            className="auth-google"
            onClick={() => void navigator.clipboard.writeText(pix.qrCode)}
          >
            Copiar código Pix
          </button>
          <p className="donate-waiting">
            <span className="donate-spinner" /> Aguardando pagamento…
          </p>
        </section>
      )}

      {stage === "done" && (
        <section className="settings-card donate-done">
          <h2>Pagamento recebido! 🎉</h2>
          <p className="muted">Seu espaço entra no ar assim que a equipe aprovar.</p>
        </section>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/lib/auth/client";
import { GRID, isFree, isValidRect, priceCents, type Rect, toPercentBox } from "@/lib/pixels";
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
type Cell = { bx: number; by: number };

const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max));

/** Rectangle spanning two dragged cells (inclusive), clamped to the grid. */
function rectFromDrag(a: Cell, b: Cell): Rect {
  const x = Math.min(a.bx, b.bx);
  const y = Math.min(a.by, b.by);
  return {
    x,
    y,
    w: Math.min(Math.abs(a.bx - b.bx) + 1, GRID.cols - x),
    h: Math.min(Math.abs(a.by - b.by) + 1, GRID.rows - y),
  };
}

/**
 * The "million pixel" board: drag across free blocks to pick a rectangle, fill
 * in image+link, pay via Pix. R$1/pixel (10×10 block = R$100); a full board is
 * R$1.000.000. The grid is responsive (fills the width) and scales the blocks.
 */
export function PixelBoard() {
  const { data: session } = useSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [taken, setTaken] = useState<Rect[]>([]);
  const [drag, setDrag] = useState<{ start: Cell; cur: Cell } | null>(null);
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

  function cellFromEvent(e: React.PointerEvent): Cell | null {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const cw = rect.width / GRID.cols;
    const ch = rect.height / GRID.rows;
    return {
      bx: clamp(Math.floor((e.clientX - rect.left) / cw), GRID.cols - 1),
      by: clamp(Math.floor((e.clientY - rect.top) / ch), GRID.rows - 1),
    };
  }

  const editable = stage === "browse" || stage === "form";
  const preview = drag ? rectFromDrag(drag.start, drag.cur) : sel;
  const previewFree = preview ? isFree(preview, taken) : true;

  function onPointerDown(e: React.PointerEvent) {
    if (!editable) return;
    const c = cellFromEvent(e);
    if (!c) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setErr(null);
    setSel(null);
    setStage("browse");
    setDrag({ start: c, cur: c });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const c = cellFromEvent(e);
    if (c) setDrag((d) => (d ? { ...d, cur: c } : d));
  }

  function onPointerUp() {
    if (!drag) return;
    const r = rectFromDrag(drag.start, drag.cur);
    setDrag(null);
    if (isValidRect(r) && isFree(r, taken)) {
      setSel(r);
      setStage("form");
    } else {
      setErr("Esse espaço está ocupado. Arraste sobre uma área livre.");
      setSel(null);
    }
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

  function cancel() {
    setSel(null);
    setStage("browse");
    setErr(null);
  }

  return (
    <div className="pixels-wrap">
      <h1 className="donate-title">Eternize sua marca</h1>
      <p className="donate-sub">
        Arraste sobre uma área livre da grade para escolher seu espaço.{" "}
        {brl(priceCents({ x: 0, y: 0, w: 1, h: 1 }))} por quadradinho ({GRID.blockPx}×{GRID.blockPx}
        px) — selecione quantos quiser. Pague via Pix; fica para sempre.
      </p>

      <div className="pixels-status">
        {preview ? (
          <>
            <strong>
              {preview.w}×{preview.h} blocos
            </strong>{" "}
            ({preview.w * GRID.blockPx}×{preview.h * GRID.blockPx}px) ·{" "}
            <span className="pixels-price">{brl(priceCents(preview))}</span>
            {!previewFree && <span className="pixels-busy"> · ocupado</span>}
          </>
        ) : (
          <span className="muted">Clique e arraste na grade para começar.</span>
        )}
      </div>

      {err && <p className="auth-error">{err}</p>}

      <div
        ref={boardRef}
        className="pixels-board"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {ads.map((a) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.imageUrl} alt={a.title ?? ""} style={{ width: "100%", height: "100%" }} />
          );
          return (
            <div
              key={a.id}
              className="pixels-ad"
              style={toPercentBox(a)}
              title={a.title ?? undefined}
            >
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
        {preview && (
          <div
            className={`pixels-sel${previewFree ? "" : " pixels-sel-bad"}`}
            style={toPercentBox(preview)}
          />
        )}
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
              <button type="button" className="comment-link" onClick={cancel}>
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

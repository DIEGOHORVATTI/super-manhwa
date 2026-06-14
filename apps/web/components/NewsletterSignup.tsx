"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { rpc } from "@/lib/rpc/client";

/**
 * Footer newsletter signup. Gated on `NEXT_PUBLIC_NEWSLETTER_ENABLED` so it only
 * appears once the server side (DB + Resend) is provisioned. Double opt-in: a
 * success here means "check your e-mail to confirm".
 */
const ENABLED = process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === "1";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (!ENABLED) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    try {
      await rpc.newsletter.subscribe({ email });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="newsletter">
      <p className="newsletter-title">Novidades no seu e-mail</p>
      {state === "done" ? (
        <p className="muted newsletter-done">
          Quase lá! Confirme pelo link que enviamos no seu e-mail.
        </p>
      ) : (
        <form className="newsletter-form" onSubmit={onSubmit}>
          <input
            className="field"
            type="email"
            required
            placeholder="seu@email.com"
            aria-label="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="pager-btn" disabled={state === "sending"}>
            {state === "sending" ? "…" : <Icon name="arrow-right" size={16} />}
          </button>
          {state === "error" && (
            <span className="newsletter-err muted">Não deu certo — tente de novo.</span>
          )}
        </form>
      )}
    </div>
  );
}

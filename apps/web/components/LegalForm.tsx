"use client";
import { useState } from "react";

import { rpc } from "@/lib/rpc/client";

export type LegalField = {
  name: string;
  label: string;
  type: "text" | "email" | "textarea" | "checkbox";
  required?: boolean;
  placeholder?: string;
};

/**
 * Generic submit form for the legal pages (DMCA / contact). Submits the collected
 * values through the typed rpc procedure picked by `kind`; on success shows a
 * thank-you, on failure keeps the data and shows an error (with the fallback
 * e-mail). Includes a hidden honeypot field.
 */
export function LegalForm({
  kind,
  fields,
  submitLabel,
  fallbackEmail,
}: {
  kind: "contact" | "dmca";
  fields: LegalField[];
  submitLabel: string;
  fallbackEmail: string;
}) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const set = (name: string, v: string | boolean) => setValues((p) => ({ ...p, [name]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    try {
      // Field config per page matches the procedure input; cast at the boundary.
      if (kind === "dmca") {
        await rpc.legal.dmca(values as Parameters<typeof rpc.legal.dmca>[0]);
      } else {
        await rpc.legal.contact(values as Parameters<typeof rpc.legal.contact>[0]);
      }
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="notice notice-ok">
        Recebemos sua mensagem | obrigado! Responderemos assim que possível.
      </p>
    );
  }

  return (
    <form className="legal-form" onSubmit={onSubmit}>
      {fields.map((f) =>
        f.type === "checkbox" ? (
          <label key={f.name} className="legal-check">
            <input
              type="checkbox"
              required={f.required}
              checked={Boolean(values[f.name])}
              onChange={(e) => set(f.name, e.target.checked)}
            />
            <span>{f.label}</span>
          </label>
        ) : (
          <label key={f.name} className="legal-field">
            <span className="legal-label">
              {f.label}
              {f.required && " *"}
            </span>
            {f.type === "textarea" ? (
              <textarea
                className="field"
                rows={4}
                required={f.required}
                placeholder={f.placeholder}
                value={(values[f.name] as string) ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
              />
            ) : (
              <input
                className="field"
                type={f.type}
                required={f.required}
                placeholder={f.placeholder}
                value={(values[f.name] as string) ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
          </label>
        ),
      )}

      {/* honeypot | bots fill it, humans don't */}
      <input
        type="text"
        name="hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="legal-hp"
        onChange={(e) => set("hp", e.target.value)}
      />

      {state === "error" && (
        <p className="notice">
          Não foi possível enviar agora. Você pode mandar direto para{" "}
          <a href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a>.
        </p>
      )}

      <button type="submit" className="pager-btn" disabled={state === "sending"}>
        {state === "sending" ? "Enviando…" : submitLabel}
      </button>
    </form>
  );
}

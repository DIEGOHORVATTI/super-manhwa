"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/client";
import { routes } from "@/lib/routes";
import { rpc } from "@/lib/rpc/client";

interface Info {
  email: string;
  role: string;
  orgName: string;
}

const ROLE_LABEL: Record<string, string> = {
  editor: "Editor",
  translator: "Tradutor",
  reviewer: "Revisor",
};

/** Accept-flow for an org e-mail invite. Shows context, then accepts when the
 *  signed-in user owns the invited e-mail. */
export function OrgInviteAccept({ token }: { token: string }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [info, setInfo] = useState<Info | null | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    rpc.org.invite
      .peek({ token })
      .then((r) => setInfo(r.invite))
      .catch(() => setInfo(null));
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await rpc.org.invite.accept({ token });
      router.push(res.slug ? routes.org(res.slug) : routes.orgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível aceitar o convite.");
      setBusy(false);
    }
  }

  if (info === "loading" || isPending) return <p className="muted studio-wrap">Carregando…</p>;
  if (!info) {
    return (
      <div className="studio-wrap">
        <p className="muted">Convite inválido, expirado ou já utilizado.</p>
        <Link href={routes.orgs} className="btn">
          Ver organizações
        </Link>
      </div>
    );
  }

  const user = session?.user;
  const roleLabel = ROLE_LABEL[info.role] ?? info.role;

  return (
    <div className="studio-wrap">
      <section className="settings-card">
        <h2>Convite para {info.orgName}</h2>
        <p className="muted">
          Você foi convidado como <strong>{roleLabel}</strong>, para o e-mail{" "}
          <strong>{info.email}</strong>.
        </p>

        {!user ? (
          <p className="muted">
            <Link href={routes.login}>Entre</Link> com {info.email} e volte a este link para
            aceitar.
          </p>
        ) : user.email?.toLowerCase() !== info.email.toLowerCase() ? (
          <p className="muted">
            Você está logado como {user.email}. Entre com {info.email} para aceitar este convite.
          </p>
        ) : (
          <button type="button" className="auth-submit" onClick={accept} disabled={busy}>
            {busy ? "Entrando…" : "Aceitar convite"}
          </button>
        )}
        {error && <p className="muted">{error}</p>}
      </section>
    </div>
  );
}

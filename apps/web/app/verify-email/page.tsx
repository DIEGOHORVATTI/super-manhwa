import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

/**
 * Shown after signup. The actual verification happens when the user clicks the
 * link in the e-mail (handled by Better Auth's /api/auth/verify-email route),
 * which then signs them in and redirects home.
 */
export default function VerifyEmailPage() {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-winbar" aria-hidden="true">
          <span className="auth-dot auth-dot-r" />
          <span className="auth-dot auth-dot-y" />
          <span className="auth-dot auth-dot-g" />
          <span className="auth-winpath">~/confirmar</span>
        </div>

        <div className="auth-card">
          <div className="auth-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="auth-logo" src="/white_logo_super_manhuwa.png" alt="" />
            <span className="auth-wordmark">
              Super Manhwa<span className="dot">.</span>
            </span>
          </div>

          <h1 className="auth-title">Confirme seu e-mail</h1>
          <p className="auth-prompt">
            <span className="auth-caret" aria-hidden="true">
              ▸
            </span>
            Falta um passo para entrar na leitura. 📬
          </p>

          <p className="auth-subtitle">
            Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta | e
            dá uma olhada na caixa de spam, vai que.
          </p>

          <Link href="/login" className="auth-submit">
            Voltar para o login
          </Link>

          <p className="auth-foot">
            <span aria-hidden="true">{"//"}</span> não recebeu? tente entrar para reenviar o link
          </p>
        </div>
      </div>
    </div>
  );
}

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
      <div className="auth-card">
        <h1 className="auth-title">Confirme seu e-mail</h1>
        <p className="auth-subtitle">
          Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta.
          Verifique também a caixa de spam.
        </p>
        <Link href="/login" className="auth-submit">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { authClient } from "@/lib/auth/client";
import { routes } from "@/lib/routes";

type Mode = "login" | "signup" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; submit: string; path: string; sub: string }> = {
  login: {
    title: "Entrar",
    submit: "Entrar",
    path: "~/entrar",
    sub: "Bem-vindo de volta. Seus capítulos esperaram por você. ☕",
  },
  signup: {
    title: "Criar conta",
    submit: "Criar conta",
    path: "~/cadastrar",
    sub: "Crie sua conta e comece a colecionar leituras. Leva 10s.",
  },
  forgot: {
    title: "Recuperar senha",
    submit: "Enviar link de recuperação",
    path: "~/recuperar",
    sub: "Sem estresse | a gente te manda um link mágico por e-mail.",
  },
  reset: {
    title: "Definir nova senha",
    submit: "Salvar nova senha",
    path: "~/nova-senha",
    sub: "Quase lá. Escolha uma senha nova e segura.",
  },
};

/** Inline eye toggle | keeps the icon set small while giving show/hide password. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

/**
 * Unified auth screen for all four flows, styled as a cozy "terminal window".
 * Talks to Better Auth via authClient; Google is offered on login/signup. Errors
 * and success notices render inline.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = COPY[mode];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message);
        router.push(routes.verifyEmail);
        return;
      }
      if (mode === "login") {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) {
          // Unverified e-mail: Better Auth (sendOnSignIn) just resent the link
          // | send them to the confirmation screen instead of an error.
          if (res.error.code === "EMAIL_NOT_VERIFIED" || res.error.status === 403) {
            router.push(routes.verifyEmail);
            return;
          }
          throw new Error(res.error.message);
        }
        router.push(routes.home);
        router.refresh();
        return;
      }
      if (mode === "forgot") {
        const res = await authClient.requestPasswordReset({
          email,
          redirectTo: routes.resetPassword,
        });
        if (res.error) throw new Error(res.error.message);
        setNotice("Se o e-mail existir, enviamos um link para redefinir a senha.");
        return;
      }
      // reset
      const token = params.get("token");
      if (!token) throw new Error("Link inválido ou expirado.");
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) throw new Error(res.error.message);
      setNotice("Senha alterada! Você já pode entrar.");
      setTimeout(() => router.push(routes.login), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: routes.home });
    } catch {
      setError("Não foi possível entrar com o Google.");
      setBusy(false);
    }
  }

  const showName = mode === "signup";
  const showEmail = mode !== "reset";
  const showPassword = mode === "login" || mode === "signup" || mode === "reset";
  const showSocial = mode === "login" || mode === "signup";

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-winbar" aria-hidden="true">
          <span className="auth-dot auth-dot-r" />
          <span className="auth-dot auth-dot-y" />
          <span className="auth-dot auth-dot-g" />
          <span className="auth-winpath">{copy.path}</span>
        </div>

        <form className="auth-card" onSubmit={onSubmit}>
          <div className="auth-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="auth-logo" src="/white_logo_super_manhuwa.png" alt="" />
            <span className="auth-wordmark">
              Super Manhwa<span className="dot">.</span>
            </span>
          </div>

          <h1 className="auth-title">{copy.title}</h1>
          <p className="auth-prompt">
            <span className="auth-caret" aria-hidden="true">
              ▸
            </span>
            {copy.sub}
          </p>

          {showSocial && (
            <>
              <button type="button" className="auth-google" onClick={google} disabled={busy}>
                <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
                  />
                </svg>
                Continuar com o Google
              </button>
              <div className="auth-divider">
                <span>ou com e-mail</span>
              </div>
            </>
          )}

          {showName && (
            <label className="auth-field">
              <span>nome</span>
              <div className="auth-input-wrap">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como te chamamos?"
                  required
                  autoComplete="name"
                />
              </div>
            </label>
          )}

          {showEmail && (
            <label className="auth-field">
              <span>email</span>
              <div className="auth-input-wrap">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  required
                  autoComplete="email"
                />
              </div>
            </label>
          )}

          {showPassword && (
            <label className="auth-field">
              <span>{mode === "reset" ? "nova senha" : "senha"}</span>
              <div className="auth-input-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  <EyeIcon off={showPw} />
                </button>
              </div>
            </label>
          )}

          {error && (
            <p className="auth-error">
              <span aria-hidden="true">✗</span> {error}
            </p>
          )}
          {notice && (
            <p className="auth-notice">
              <span aria-hidden="true">✓</span> {notice}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? (
              "Aguarde…"
            ) : (
              <>
                {showSocial && <Icon name="log-in" size={16} />}
                {copy.submit}
              </>
            )}
          </button>

          <div className="auth-links">
            {mode === "login" && (
              <>
                <Link href={routes.forgotPassword}>Esqueci minha senha</Link>
                <Link href={routes.signup}>Criar uma conta</Link>
              </>
            )}
            {mode === "signup" && <Link href={routes.login}>Já tenho conta</Link>}
            {(mode === "forgot" || mode === "reset") && (
              <Link href={routes.login}>Voltar ao login</Link>
            )}
          </div>

          <p className="auth-foot">
            <span aria-hidden="true">{"//"}</span> feito com ♥ e cafeína para quem lê de madrugada
          </p>
        </form>
      </div>
    </div>
  );
}

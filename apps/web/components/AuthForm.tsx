"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { authClient } from "@/lib/auth/client";

type Mode = "login" | "signup" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; submit: string }> = {
  login: { title: "Entrar", submit: "Entrar" },
  signup: { title: "Criar conta", submit: "Criar conta" },
  forgot: { title: "Recuperar senha", submit: "Enviar link de recuperação" },
  reset: { title: "Definir nova senha", submit: "Salvar nova senha" },
};

/**
 * Unified auth screen for all four flows. Talks to Better Auth via authClient;
 * Google is offered on login/signup. Errors and success notices render inline.
 * Visual language matches the existing card/login button styles.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        router.push("/verify-email");
        return;
      }
      if (mode === "login") {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
        router.push("/");
        router.refresh();
        return;
      }
      if (mode === "forgot") {
        const res = await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
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
      setTimeout(() => router.push("/login"), 1200);
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
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
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
      <form className="auth-card" onSubmit={onSubmit}>
        <h1 className="auth-title">{copy.title}</h1>

        {showSocial && (
          <>
            <button type="button" className="auth-google" onClick={google} disabled={busy}>
              <Icon name="log-in" size={16} /> Continuar com o Google
            </button>
            <div className="auth-divider"><span>ou</span></div>
          </>
        )}

        {showName && (
          <label className="auth-field">
            <span>Nome</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
        )}

        {showEmail && (
          <label className="auth-field">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
        )}

        {showPassword && (
          <label className="auth-field">
            <span>{mode === "reset" ? "Nova senha" : "Senha"}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        )}

        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Aguarde…" : copy.submit}
        </button>

        <div className="auth-links">
          {mode === "login" && (
            <>
              <Link href="/forgot-password">Esqueci minha senha</Link>
              <Link href="/signup">Criar uma conta</Link>
            </>
          )}
          {mode === "signup" && <Link href="/login">Já tenho conta</Link>}
          {(mode === "forgot" || mode === "reset") && <Link href="/login">Voltar ao login</Link>}
        </div>
      </form>
    </div>
  );
}

"use client";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { varAlpha } from "minimal-shared/utils";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { googleAuthEnabled } from "@/lib/flags";
import { routes } from "@/lib/routes";

type Mode = "login" | "signup" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; submit: string; sub: string }> = {
  login: {
    title: "Entrar",
    submit: "Entrar",
    sub: "Seus capítulos esperaram por você.",
  },
  signup: {
    title: "Criar conta",
    submit: "Criar conta",
    sub: "Guarde sua biblioteca e continue de onde parou em qualquer aparelho.",
  },
  forgot: {
    title: "Recuperar senha",
    submit: "Enviar link de recuperação",
    sub: "A gente te manda um link por e-mail.",
  },
  reset: {
    title: "Nova senha",
    submit: "Salvar nova senha",
    sub: "Escolha uma senha nova e segura.",
  },
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

/** Link in the switch line ("Não tem conta? Criar conta"). */
function SwitchLine({ text, action, href }: { text: string; action: string; href: string }) {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {text}{" "}
      <Link component={NextLink} href={href} fontWeight={700}>
        {action}
      </Link>
    </Typography>
  );
}

/**
 * Unified auth screen for all four flows: brand hero image fading into the form
 * (mobile-first, same layout as the Scale app). Talks to Better
 * Auth via authClient; Google is offered on login/signup.
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
    <Box sx={{ maxWidth: 480, mx: { xs: -2, sm: "auto" }, mt: { xs: -3, sm: 0 } }}>
      <Box
        sx={{
          position: "relative",
          height: { xs: 180, sm: 170 },
          overflow: "hidden",
          borderRadius: { sm: "24px 24px 0 0" },
        }}
      >
        <Box
          component="img"
          src="/banner_1500x500.jpeg"
          alt=""
          sx={{
            position: "absolute",
            inset: 0,
            width: 1,
            height: 1,
            objectFit: "cover",
          }}
        />
        <Box
          sx={(theme) => ({
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, transparent 55%, ${varAlpha(theme.vars.palette.background.paperChannel, 0.7)} 80%, ${theme.vars.palette.background.paper} 100%)`,
          })}
        />
      </Box>

      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{
          bgcolor: "background.paper",
          mt: "-1px",
          px: { xs: 3, sm: 4 },
          pt: 1,
          pb: 4,
          borderRadius: { sm: "0 0 24px 24px" },
        }}
      >
        <Stack spacing={2.5}>
          <Stack spacing={0.5} alignItems="center" textAlign="center">
            <Typography variant="h3" component="h1">
              {copy.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {copy.sub}
            </Typography>
          </Stack>

          {mode === "login" && (
            <SwitchLine text="Não tem conta?" action="Criar conta" href={routes.signup} />
          )}
          {mode === "signup" && (
            <SwitchLine text="Já tem conta?" action="Entrar" href={routes.login} />
          )}

          {showSocial && googleAuthEnabled && (
            <>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                fullWidth
                startIcon={<GoogleIcon />}
                onClick={google}
                disabled={busy}
              >
                Continuar com o Google
              </Button>
              <Divider sx={{ typography: "caption", color: "text.secondary" }}>
                ou com e-mail
              </Divider>
            </>
          )}

          {showName && (
            <TextField
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como te chamamos?"
              required
              fullWidth
              autoComplete="name"
            />
          )}

          {showEmail && (
            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
              fullWidth
              autoComplete="email"
              slotProps={{ htmlInput: { inputMode: "email", autoCapitalize: "none" } }}
            />
          )}

          {showPassword && (
            <TextField
              label={mode === "reset" ? "Nova senha" : "Senha"}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              slotProps={{
                htmlInput: { minLength: 8 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                        edge="end"
                      >
                        {showPw ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          {mode === "login" && (
            <Link
              component={NextLink}
              href={routes.forgotPassword}
              variant="body2"
              sx={{ alignSelf: "flex-end" }}
            >
              Esqueci minha senha
            </Link>
          )}

          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}

          <Button type="submit" variant="contained" size="large" fullWidth loading={busy}>
            {copy.submit}
          </Button>

          {(mode === "forgot" || mode === "reset") && (
            <Link component={NextLink} href={routes.login} variant="body2" align="center">
              Voltar ao login
            </Link>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

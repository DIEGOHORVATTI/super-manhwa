import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Definir nova senha" };

export default function ResetPasswordPage() {
  // AuthForm reads the ?token= from the reset e-mail via useSearchParams.
  return (
    <Suspense>
      <AuthForm mode="reset" />
    </Suspense>
  );
}

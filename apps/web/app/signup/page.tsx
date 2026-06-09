import type { Metadata } from "next";

import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}

import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Newsletter",
  robots: { index: false },
};

const MESSAGES: Record<string, { title: string; body: string }> = {
  confirmado: {
    title: "Inscrição confirmada 🎉",
    body: "Pronto! Você vai receber os destaques da semana no seu e-mail.",
  },
  cancelado: {
    title: "Inscrição cancelada",
    body: "Você não receberá mais a newsletter. Pode voltar quando quiser.",
  },
  invalido: {
    title: "Link inválido ou expirado",
    body: "Não conseguimos validar este link. Tente se inscrever novamente.",
  },
};

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const msg = MESSAGES[status ?? ""] ?? MESSAGES.invalido;
  return (
    <div className="state-screen">
      <h1 className="state-title">{msg.title}</h1>
      <p className="muted">{msg.body}</p>
      <div className="state-actions">
        <Link className="pager-btn" href="/">
          <Icon name="house" size={16} /> Início
        </Link>
      </div>
    </div>
  );
}

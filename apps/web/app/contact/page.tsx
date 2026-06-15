import type { Metadata } from "next";
import { LegalForm } from "@/components/LegalForm";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Contato",
  description: "Como falar com a equipe do Super Manhwa.",
};

export default function ContatoPage() {
  return (
    <StaticPage title="Contato">
      <p>
        Quer mandar uma sugestão, relatar um bug ou tirar uma dúvida? Use um dos canais abaixo |
        respondemos assim que possível.
      </p>
      <ul>
        <li>
          <strong>E-mail:</strong>{" "}
          <a href="mailto:contato@supermanhwa.app">contato@supermanhwa.app</a>
        </li>
        <li>
          <strong>GitHub:</strong>{" "}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            abra uma issue
          </a>
        </li>
      </ul>
      <p>
        Para pedidos de remoção de conteúdo protegido por direitos autorais, use o procedimento
        descrito na página de <a href="/dmca">DMCA</a>.
      </p>

      <h2>Enviar mensagem</h2>
      <LegalForm
        kind="contact"
        submitLabel="Enviar"
        fallbackEmail="contato@supermanhwa.app"
        fields={[
          { name: "name", label: "Nome", type: "text", required: true },
          { name: "email", label: "E-mail", type: "email", required: true },
          { name: "subject", label: "Assunto", type: "text", required: true },
          { name: "message", label: "Mensagem", type: "textarea", required: true },
        ]}
      />
    </StaticPage>
  );
}

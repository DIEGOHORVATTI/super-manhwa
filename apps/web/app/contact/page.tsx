import type { Metadata } from "next";
import { LegalForm } from "@/components/LegalForm";
import { StaticPage } from "@/components/StaticPage";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Contato",
  description: "Como falar com a equipe do Super Novel.",
};

export default function ContatoPage() {
  return (
    <StaticPage title="Contato">
      <p>
        Quer mandar uma sugestão, relatar um bug, denunciar um comentário ou exercer seus direitos
        sobre seus dados (acesso, correção, exclusão da conta)? Use o formulário abaixo. Respondemos
        assim que possível, em até 15 dias para pedidos sobre dados.
      </p>
      <p>
        Para pedidos de remoção de conteúdo protegido por direitos autorais, use o procedimento
        descrito na página de <a href={routes.dmca}>DMCA</a>.
      </p>

      <h2>Enviar mensagem</h2>
      <LegalForm
        kind="contact"
        submitLabel="Enviar"
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

import type { Metadata } from "next";
import { LegalForm } from "@/components/LegalForm";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "DMCA",
  description: "Política de direitos autorais e pedidos de remoção.",
};

export default function DmcaPage() {
  return (
    <StaticPage title="DMCA — Direitos Autorais" updated="28 de maio de 2026">
      <p>
        O <strong>Super Manhwa</strong> respeita os direitos de propriedade intelectual. Não
        hospedamos arquivos: apenas indexamos e exibimos conteúdo disponibilizado publicamente por
        fontes de terceiros.
      </p>
      <h2>Pedido de remoção</h2>
      <p>
        Se você é o detentor dos direitos (ou seu representante autorizado) e acredita que um
        conteúdo viola seus direitos, envie uma notificação contendo:
      </p>
      <ul>
        <li>Identificação da obra protegida.</li>
        <li>O link (URL) exato no Super Manhwa onde o conteúdo aparece.</li>
        <li>Seus dados de contato (nome, e-mail e organização, se houver).</li>
        <li>
          Uma declaração de boa-fé de que o uso não foi autorizado pelo titular, seu agente ou pela
          lei.
        </li>
        <li>
          Uma declaração de que as informações são verdadeiras e de que você é o titular ou seu
          representante.
        </li>
      </ul>
      <p>
        Preencha o formulário abaixo (ou envie para{" "}
        <a href="mailto:dmca@supermanhwa.app">dmca@supermanhwa.app</a>). Avaliaremos e, quando
        cabível, removeremos o item indexado o mais rápido possível. Como não hospedamos os
        arquivos, recomendamos também contatar a fonte original.
      </p>

      <h2>Enviar pedido de remoção</h2>
      <LegalForm
        endpoint="/api/legal/dmca"
        submitLabel="Enviar pedido"
        fallbackEmail="dmca@supermanhwa.app"
        fields={[
          { name: "name", label: "Nome / organização", type: "text", required: true },
          { name: "email", label: "E-mail de contato", type: "email", required: true },
          { name: "work", label: "Obra protegida", type: "text", required: true },
          {
            name: "urls",
            label: "URL(s) no Super Manhwa",
            type: "textarea",
            required: true,
            placeholder: "Uma por linha",
          },
          { name: "details", label: "Detalhes adicionais", type: "textarea" },
          {
            name: "goodFaith",
            label:
              "Declaro, de boa-fé, que o uso não foi autorizado pelo titular, seu agente ou pela lei.",
            type: "checkbox",
            required: true,
          },
          {
            name: "accurate",
            label:
              "Declaro que as informações são verdadeiras e que sou o titular ou seu representante.",
            type: "checkbox",
            required: true,
          },
        ]}
      />
    </StaticPage>
  );
}

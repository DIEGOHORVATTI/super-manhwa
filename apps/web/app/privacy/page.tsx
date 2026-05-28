import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o Super Manhwa lida com seus dados.",
};

export default function PrivacidadePage() {
  return (
    <StaticPage title="Política de Privacidade" updated="28 de maio de 2026">
      <p>
        Esta política explica como o <strong>Super Manhwa</strong> trata informações ao usar o site.
        Levamos sua privacidade a sério e coletamos o mínimo necessário para o serviço funcionar.
      </p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Dados de uso:</strong> páginas visitadas e termos de busca, de forma agregada e
          anônima, para melhorar o serviço.
        </li>
        <li>
          <strong>Dados técnicos:</strong> tipo de navegador e logs de acesso, usados para
          segurança e diagnóstico.
        </li>
      </ul>
      <p>
        Não exigimos cadastro nem coletamos nome, e-mail ou dados sensíveis para navegar e ler.
      </p>
      <h2>Cookies</h2>
      <p>
        Usamos cookies essenciais para o funcionamento do site. Detalhes na{" "}
        <a href="/cookies">Política de Cookies</a>.
      </p>
      <h2>Compartilhamento</h2>
      <p>
        Não vendemos nem compartilhamos seus dados com terceiros, exceto quando exigido por lei.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção ou exclusão de eventuais dados entrando em contato pela
        página de <a href="/contact">Contato</a>.
      </p>
    </StaticPage>
  );
}

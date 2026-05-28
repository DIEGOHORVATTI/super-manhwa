import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Como o Super Manhwa usa cookies.",
};

export default function CookiesPage() {
  return (
    <StaticPage title="Política de Cookies" updated="28 de maio de 2026">
      <p>
        Cookies são pequenos arquivos guardados no seu navegador. O <strong>Super Manhwa</strong>{" "}
        usa apenas o estritamente necessário para o site funcionar.
      </p>
      <h2>Tipos de cookies que usamos</h2>
      <ul>
        <li>
          <strong>Essenciais:</strong> mantêm preferências de exibição e o funcionamento básico do
          site.
        </li>
        <li>
          <strong>Analíticos (opcionais):</strong> nos ajudam a entender, de forma anônima e
          agregada, como o site é usado.
        </li>
      </ul>
      <p>Não usamos cookies de publicidade nem rastreamento entre sites de terceiros.</p>
      <h2>Como controlar</h2>
      <p>
        Você pode bloquear ou apagar cookies nas configurações do seu navegador. Desativar os
        cookies essenciais pode afetar o funcionamento do site.
      </p>
      <p>
        Para mais detalhes sobre dados, veja a <a href="/privacy">Política de Privacidade</a>.
      </p>
    </StaticPage>
  );
}

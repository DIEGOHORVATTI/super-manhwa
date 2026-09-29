import type { Metadata } from "next";

import { AnalyticsOptOut } from "@/components/AnalyticsOptOut";
import { StaticPage } from "@/components/StaticPage";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Como o Super Novel usa cookies e o armazenamento do navegador.",
};

export default function CookiesPage() {
  return (
    <StaticPage title="Política de Cookies" updated="28 de setembro de 2026">
      <p>
        Cookies são pequenos arquivos guardados no seu navegador. O <strong>Super Novel</strong> usa
        cookies e o armazenamento local do navegador para o site funcionar e para medir o uso.
      </p>

      <h2>Essenciais</h2>
      <ul>
        <li>
          <strong>Sessão de login:</strong> mantém você conectado à sua conta.
        </li>
        <li>
          <strong>Indicação (ref):</strong> guarda o código de quem indicou o site até você criar a
          conta.
        </li>
        <li>
          <strong>Armazenamento do navegador:</strong> tema, preferências do leitor e das vozes,
          biblioteca, posição de leitura e os arquivos que deixam o app instalado funcionar sem
          internet.
        </li>
      </ul>

      <h2>Medição de uso</h2>
      <ul>
        <li>
          <strong>Vercel Web Analytics e Speed Insights:</strong> contam visitas e medem o
          desempenho das páginas de forma agregada, sem cookies.
        </li>
        <li>
          <strong>Google Analytics para Firebase:</strong> usa cookies (<code>_ga</code>) com um
          identificador aleatório para entender quais páginas e recursos são usados. Não usamos
          esses dados para publicidade.
        </li>
      </ul>
      <p>Você pode desligar o Google Analytics neste navegador quando quiser:</p>
      <AnalyticsOptOut />

      <h2>Como controlar</h2>
      <p>
        Você também pode bloquear ou apagar cookies nas configurações do navegador. Bloquear os
        essenciais impede o login e pode apagar sua biblioteca local.
      </p>
      <p>
        Mais detalhes sobre dados na <a href={routes.privacy}>Política de Privacidade</a>.
      </p>
    </StaticPage>
  );
}

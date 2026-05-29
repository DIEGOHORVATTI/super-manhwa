import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Termos de Serviço",
  description: "Termos de uso do Super Manhwa.",
};

export default function TermosPage() {
  return (
    <StaticPage title="Termos de Serviço" updated="28 de maio de 2026">
      <p>
        Ao acessar o <strong>Super Manhwa</strong>, você concorda com os termos abaixo. Se não
        concordar, por favor não utilize o serviço.
      </p>
      <h2>1. Uso do serviço</h2>
      <p>
        O serviço é fornecido &quot;como está&quot;, gratuitamente e com finalidade educacional e de
        demonstração. Não oferecemos garantias de disponibilidade, precisão ou continuidade.
      </p>
      <h2>2. Conteúdo</h2>
      <p>
        Não hospedamos arquivos. Todo o conteúdo exibido pertence aos seus respectivos autores e
        editoras e é obtido de fontes públicas de terceiros. Não nos responsabilizamos pelo conteúdo
        dessas fontes.
      </p>
      <h2>3. Conduta</h2>
      <p>
        Você concorda em não usar o serviço para fins ilegais, nem tentar sobrecarregar, copiar em
        massa ou comprometer a infraestrutura do site.
      </p>
      <h2>4. Propriedade intelectual</h2>
      <p>
        Pedidos de remoção de conteúdo protegido devem seguir o procedimento da página de{" "}
        <a href="/dmca">DMCA</a>.
      </p>
      <h2>5. Alterações</h2>
      <p>
        Podemos atualizar estes termos a qualquer momento. O uso continuado após mudanças implica
        concordância com a versão vigente.
      </p>
    </StaticPage>
  );
}

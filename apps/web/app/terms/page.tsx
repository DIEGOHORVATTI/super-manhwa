import type { Metadata } from "next";

import { StaticPage } from "@/components/StaticPage";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Termos de Serviço",
  description: "Termos de uso do Super Novel.",
};

export default function TermosPage() {
  return (
    <StaticPage title="Termos de Serviço" updated="28 de setembro de 2026">
      <p>
        Ao usar o <strong>Super Novel</strong> (supermanhwa.com e o app instalado a partir dele),
        você concorda com estes termos. Se não concordar, não use o serviço.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O Super Novel permite ler e ouvir light novels e web novels em português, com narração por
        voz sintética e recursos para aprender inglês. O serviço é oferecido &quot;como está&quot;,
        sem garantia de disponibilidade contínua, e pode mudar ou ser encerrado a qualquer momento.
      </p>

      <h2>2. Conteúdo das obras</h2>
      <p>
        Não hospedamos as obras: os capítulos são obtidos de fontes públicas de terceiros no momento
        da leitura, e os direitos pertencem aos autores, tradutores e editoras. As traduções para o
        inglês e a narração são geradas automaticamente e podem conter erros. Pedidos de remoção
        seguem a página de <a href={routes.dmca}>DMCA</a>.
      </p>

      <h2>3. Sua conta</h2>
      <p>
        É preciso ter pelo menos 13 anos para criar uma conta. Você é responsável pelas informações
        que fornece e por manter sua senha em segurança. Você pode pedir a exclusão da conta a
        qualquer momento pelo <a href={routes.contact}>formulário de contato</a>.
      </p>

      <h2>4. Comentários e conduta</h2>
      <p>Ao comentar ou usar o serviço, você não pode:</p>
      <ul>
        <li>
          publicar conteúdo ilegal, ofensivo, discriminatório, sexual ou com dados de terceiros;
        </li>
        <li>fazer spam, se passar por outra pessoa ou assediar outros usuários;</li>
        <li>copiar o site em massa, sobrecarregar ou tentar invadir a infraestrutura.</li>
      </ul>
      <p>
        Você é responsável pelo que publica. Podemos remover conteúdo e suspender contas que violem
        estes termos. Para denunciar um comentário, use o{" "}
        <a href={routes.contact}>formulário de contato</a> com o link dele.
      </p>

      <h2>5. Recursos pagos</h2>
      <p>
        Recursos pagos, como o Premium do aprendizado, são cobrados pelo Mercado Pago, com o preço e
        a recorrência mostrados antes da compra. Você pode cancelar a assinatura quando quiser; o
        acesso vale até o fim do período pago. Pelo Código de Defesa do Consumidor, você pode
        desistir em até 7 dias após a contratação e receber o valor de volta.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela lei, não respondemos por danos indiretos, perda de dados
        ou indisponibilidade do serviço, nem pelo conteúdo das fontes de terceiros.
      </p>

      <h2>7. Privacidade</h2>
      <p>
        O tratamento dos seus dados segue a <a href={routes.privacy}>Política de Privacidade</a>.
      </p>

      <h2>8. Alterações e lei aplicável</h2>
      <p>
        Podemos atualizar estes termos; a data no topo mostra a versão vigente, e o uso continuado
        significa concordância. Estes termos seguem a lei brasileira, e fica eleito o foro do
        domicílio do consumidor.
      </p>
    </StaticPage>
  );
}

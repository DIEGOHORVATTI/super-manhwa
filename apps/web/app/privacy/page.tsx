import type { Metadata } from "next";

import { StaticPage } from "@/components/StaticPage";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o Super Novel coleta, usa e protege seus dados.",
};

export default function PrivacyPage() {
  return (
    <StaticPage title="Política de Privacidade" updated="28 de setembro de 2026">
      <p>
        Esta política explica quais dados o <strong>Super Novel</strong> (supermanhwa.com e o app
        instalado a partir dele) coleta, para quê, com quem compartilha e quais são os seus
        direitos, nos termos da Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Coletamos só
        o necessário para o serviço funcionar.
      </p>

      <h2>1. Dados que coletamos</h2>
      <p>Para ler e ouvir não é preciso conta. Quando você usa cada recurso, tratamos:</p>
      <ul>
        <li>
          <strong>Conta:</strong> nome, e-mail e senha (guardada só como hash, nunca em texto). Se
          você entrar com o Google, recebemos nome, e-mail e foto da sua conta Google.
        </li>
        <li>
          <strong>Perfil:</strong> @usuário, foto, capa e bio, se você preencher.
        </li>
        <li>
          <strong>Sessão e segurança:</strong> endereço IP e navegador de cada sessão aberta, para
          manter você conectado e detectar acessos indevidos.
        </li>
        <li>
          <strong>Leitura:</strong> biblioteca, histórico e posição de leitura. Sem conta, ficam só
          no seu navegador; com conta, são sincronizados para você continuar em outro aparelho.
        </li>
        <li>
          <strong>Aprendizado de inglês:</strong> palavras salvas, frases de exemplo, revisões,
          pontos e sequência de estudo.
        </li>
        <li>
          <strong>Comentários:</strong> o texto que você publica e seus votos. Comentários são
          públicos e aparecem com seu nome e foto.
        </li>
        <li>
          <strong>Newsletter:</strong> seu e-mail, se você se inscrever.
        </li>
        <li>
          <strong>Pagamentos:</strong> quando você compra algo no site (como o Premium), o pagamento
          é feito no Mercado Pago. Guardamos só o status, o valor e a identificação da transação;
          nunca vemos dados de cartão.
        </li>
        <li>
          <strong>Contato e DMCA:</strong> nome, e-mail e o conteúdo da mensagem enviada pelos
          formulários.
        </li>
        <li>
          <strong>Indicação:</strong> se você chegar por um link de afiliado, um cookie guarda o
          código de quem indicou até você criar a conta.
        </li>
        <li>
          <strong>Uso do site:</strong> páginas visitadas, tipo de aparelho e navegador, país e
          cidade aproximados e desempenho das páginas (veja a seção 4).
        </li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Criar e manter sua conta e sincronizar sua leitura (execução do serviço).</li>
        <li>Enviar e-mails de confirmação, recuperação de senha e a newsletter que você pediu.</li>
        <li>Processar pagamentos e cumprir obrigações legais e fiscais.</li>
        <li>Prevenir fraude e abuso e responder a pedidos legais (legítimo interesse).</li>
        <li>Entender como o site é usado e corrigir problemas (legítimo interesse).</li>
      </ul>
      <p>Não vendemos seus dados e não os usamos para publicidade.</p>

      <h2>3. Com quem compartilhamos</h2>
      <p>Só com os fornecedores necessários para o serviço funcionar:</p>
      <ul>
        <li>
          <strong>Vercel</strong> (hospedagem do site) e <strong>Neon</strong> (banco de dados).
        </li>
        <li>
          <strong>Resend</strong> (envio de e-mails).
        </li>
        <li>
          <strong>Mercado Pago</strong> (pagamentos).
        </li>
        <li>
          <strong>Google</strong> (login com Google, se você usar, e Google Analytics para
          Firebase).
        </li>
        <li>
          <strong>Google Tradutor e Microsoft Edge (vozes):</strong> recebem apenas o texto dos
          capítulos e as palavras a traduzir ou narrar, sem nenhum dado seu.
        </li>
      </ul>
      <p>
        Alguns desses fornecedores guardam dados fora do Brasil (principalmente nos Estados Unidos),
        com as garantias contratuais exigidas pela LGPD. Também podemos compartilhar dados quando a
        lei ou uma ordem judicial exigir.
      </p>

      <h2>4. Cookies e medição de uso</h2>
      <p>
        Usamos cookies essenciais (sessão de login e indicação) e o armazenamento do navegador para
        preferências, biblioteca e o funcionamento offline do app instalado. Para medir o uso,
        usamos o Vercel Web Analytics, que não usa cookies, e o Google Analytics para Firebase, que
        usa cookies com um identificador aleatório. Você pode desligar o Google Analytics a qualquer
        momento na <a href={routes.cookies}>Política de Cookies</a>.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <ul>
        <li>Dados da conta: enquanto a conta existir.</li>
        <li>Sessões: até você sair ou a sessão expirar.</li>
        <li>Pagamentos: pelo prazo exigido pela legislação fiscal.</li>
        <li>Mensagens de contato e DMCA: pelo tempo necessário para responder e se defender.</li>
      </ul>

      <h2>6. Seus direitos</h2>
      <p>
        Você pode pedir a qualquer momento: confirmação de que tratamos seus dados, acesso,
        correção, portabilidade, anonimização ou exclusão, informação sobre com quem compartilhamos
        e revogação do consentimento. Para isso, e para excluir sua conta, use o{" "}
        <a href={routes.contact}>formulário de contato</a> com o e-mail da conta. Respondemos em até
        15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>7. Segurança</h2>
      <p>
        Todo o tráfego é criptografado (HTTPS), senhas ficam só como hash e o acesso ao banco é
        restrito. Nenhum sistema é 100% seguro; se houver um incidente relevante, avisaremos os
        afetados e a ANPD.
      </p>

      <h2>8. Crianças</h2>
      <p>
        O Super Novel não é direcionado a menores de 13 anos, e não criamos contas sabendo que são
        de crianças. Se isso acontecer, fale conosco para removermos os dados.
      </p>

      <h2>9. Mudanças nesta política</h2>
      <p>
        Podemos atualizar esta política. A data no topo mostra a última versão; mudanças importantes
        serão avisadas no site.
      </p>
    </StaticPage>
  );
}

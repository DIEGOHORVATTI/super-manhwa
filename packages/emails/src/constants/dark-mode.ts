import { EmailStyles } from "./styles";

const { dark } = EmailStyles;

/**
 * CSS de dark mode injetado no <Head>. Clientes que respeitam
 * `prefers-color-scheme` (Apple Mail, iOS Mail, alguns webmails) escurecem o
 * card claro e clareiam o texto. Gmail/Outlook ignoram e fazem auto-inversão
 * própria — por isso a paleta clara já é o fallback seguro. Estilos inline
 * vencem o stylesheet, então cada regra precisa de `!important`.
 *
 * Apenas `.em-body` e `.em-card` recebem classe; o resto é alvejado por
 * descendência (`.em-card p/a`) pra não poluir todas as views — todo texto do
 * card vira um cinza claro legível sobre o fundo escuro. `a.em-btn` tem
 * especificidade maior pra preservar o texto branco do botão sobre o acento.
 */
export const darkModeCss = `
@media (prefers-color-scheme: dark) {
  .em-body { background: ${dark.background} !important; }
  .em-card { background: ${dark.surface} !important; border-color: ${dark.border} !important; }
  .em-card p { color: ${dark.text} !important; }
  .em-card a { color: ${dark.link} !important; }
  .em-card a.em-btn { color: #ffffff !important; }
  .em-card hr { border-color: ${dark.border} !important; }
}
`;

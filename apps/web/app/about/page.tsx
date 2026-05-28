import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Sobre nós",
  description: "O que é o Super Manhwa e como ele funciona.",
};

export default function SobrePage() {
  return (
    <StaticPage title="Sobre nós">
      <p>
        O <strong>Super Manhwa</strong> é um leitor e catálogo web de mangás, manhwas e webtoons
        que agrega obras de várias fontes públicas em um só lugar, com busca rápida e uma
        experiência de leitura limpa.
      </p>
      <p>
        O projeto é gratuito e tem propósito educacional e de demonstração técnica. Não hospedamos
        nenhum arquivo de imagem ou capítulo: apenas indexamos e exibimos conteúdo disponibilizado
        publicamente pelas fontes originais. Todos os direitos das obras pertencem aos seus
        respectivos autores, editoras e detentores de licença.
      </p>
      <h2>Como funciona</h2>
      <ul>
        <li>Buscamos metadados e capítulos diretamente das fontes no momento do acesso.</li>
        <li>Apresentamos tudo em português (pt-BR) por padrão.</li>
        <li>Se você é detentor de direitos e quer remover uma obra, veja nossa página de DMCA.</li>
      </ul>
      <p>
        Gostou do projeto ou encontrou um problema? Veja a página de <a href="/contact">Contato</a>.
      </p>
    </StaticPage>
  );
}

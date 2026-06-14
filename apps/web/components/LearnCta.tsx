import Link from "next/link";

import { Icon } from "@/components/Icon";

/**
 * Marketing CTA for the language-learning layer — "learn English while reading
 * what you love". Pure server component (no data), shown on the home landing and
 * at the end of the reader. Links to /learn.
 */
export function LearnCta() {
  return (
    <Link className="learn-cta" href="/learn">
      <span className="learn-cta-icon">
        <Icon name="book-open" size={22} />
      </span>
      <span className="learn-cta-text">
        <strong>Aprenda inglês lendo o que você ama</strong>
        <span>
          Clique nas palavras que não conhece, salve no seu vocabulário e revise com repetição
          espaçada — sem sair da leitura.
        </span>
      </span>
      <span className="learn-cta-go">
        Começar <Icon name="arrow-right" size={16} />
      </span>
    </Link>
  );
}

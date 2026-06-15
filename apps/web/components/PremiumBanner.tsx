"use client";
import Link from "next/link";

import { Icon } from "@/components/Icon";
import { useSession } from "@/lib/auth/client";
import { routes } from "@/lib/routes";

const PERKS = ["Palavras ilimitadas", "Sentence mining", "Estatísticas", "Export pro Anki"];

/**
 * Strong subscription CTA. Hidden for users who are already premium. `compact`
 * renders a slim inline strip (home); the default is a full perk card (learn
 * dashboard / reader limit).
 */
export function PremiumBanner({ compact = false }: { compact?: boolean }) {
  const { data } = useSession();
  const plan = (data?.user as { plan?: string } | undefined)?.plan;
  if (plan === "premium") return null;

  if (compact) {
    return (
      <Link className="premium-strip" href={routes.learnPremium}>
        <Icon name="sparkles" size={18} />
        <span>
          <strong>Vire Premium</strong> | aprenda sem limites e apoie o site.
        </span>
        <span className="premium-strip-go">Assinar</span>
      </Link>
    );
  }

  return (
    <Link className="premium-banner" href={routes.learnPremium}>
      <div className="premium-banner-head">
        <Icon name="sparkles" size={22} />
        <strong>Super Manhwa Premium</strong>
      </div>
      <p>Aprenda sem limites enquanto lê. Apoie a plataforma e desbloqueie tudo.</p>
      <ul className="premium-banner-perks">
        {PERKS.map((p) => (
          <li key={p}>
            <Icon name="circle-check-big" size={14} /> {p}
          </li>
        ))}
      </ul>
      <span className="premium-banner-cta">Assinar Premium</span>
    </Link>
  );
}

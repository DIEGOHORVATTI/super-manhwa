import { Column, Hr, Img, Link, Row, Section, Text } from "@react-email/components";

import Main from "../components/main";
import CtaButton from "../components/cta-button";
import { EmailStyles } from "../constants/styles";

export type DigestItem = {
  title: string;
  imageUrl?: string;
  link: string;
  /** Teaser curto da obra (opcional). */
  description?: string;
};

type Props = {
  trending: DigestItem[];
  newest: DigestItem[];
  browseUrl: string;
  unsubscribeUrl: string;
};

/** Corta o teaser em ~texto de e-mail, sem cortar no meio da palavra. */
function clamp(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

function Shelf({ title, items }: { title: string; items: DigestItem[] }) {
  const { colors, typography, radius, spacing } = EmailStyles;
  if (items.length === 0) return null;
  return (
    <Section style={{ marginBottom: spacing.sm }}>
      <Text
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: "0 0 14px",
        }}
      >
        {title}
      </Text>
      {items.map((it) => (
        <Row key={it.link} style={{ marginBottom: spacing.lg }}>
          <Column style={{ width: "64px", verticalAlign: "top" }}>
            <Link href={it.link}>
              {it.imageUrl ? (
                <Img
                  src={it.imageUrl}
                  alt=""
                  width="56"
                  height="84"
                  style={{
                    borderRadius: radius.sm,
                    objectFit: "cover",
                    border: `1px solid ${colors.border}`,
                  }}
                />
              ) : null}
            </Link>
          </Column>
          <Column style={{ verticalAlign: "top", paddingLeft: spacing.md }}>
            <Link
              href={it.link}
              style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                textDecoration: "none",
                lineHeight: typography.lineHeight.tight,
              }}
            >
              {it.title}
            </Link>
            {it.description ? (
              <Text
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.muted,
                  lineHeight: typography.lineHeight.normal,
                  margin: "4px 0 0",
                }}
              >
                {clamp(it.description)}
              </Text>
            ) : null}
          </Column>
        </Row>
      ))}
    </Section>
  );
}

/** Newsletter semanal (em alta + novidades), renderizada pela rota de cron. */
export default function NewsletterDigestEmail({
  trending,
  newest,
  browseUrl,
  unsubscribeUrl,
}: Props) {
  const { colors, typography, spacing } = EmailStyles;

  return (
    <Main preview="Os destaques da semana no Super Manhwa">
      <Text
        style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: "0 0 4px",
        }}
      >
        Destaques da semana
      </Text>
      <Text
        style={{ fontSize: typography.fontSize.base, color: colors.text.muted, margin: "0 0 20px" }}
      >
        O que está em alta e as novidades pra você ler.
      </Text>

      <Shelf title="🔥 Em tendência" items={trending} />
      <Hr style={{ borderColor: colors.border, margin: "18px 0" }} />
      <Shelf title="🆕 Novidades" items={newest} />

      <Section style={{ textAlign: "center", margin: "24px 0 6px" }}>
        <CtaButton href={browseUrl}>Explorar o catálogo</CtaButton>
      </Section>

      <Text
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          textAlign: "center",
          marginTop: spacing.md,
        }}
      >
        <Link href={unsubscribeUrl} style={{ color: colors.text.muted }}>
          Cancelar inscrição
        </Link>
      </Text>
    </Main>
  );
}

NewsletterDigestEmail.PreviewProps = {
  trending: [
    {
      title: "Solo Leveling",
      imageUrl: "https://placehold.co/56x84/7c5cff/fff?text=SL",
      link: "http://localhost:3000/manga/1",
      description:
        "O caçador mais fraco do mundo desperta um sistema secreto e começa a subir de nível sem limites.",
    },
    {
      title: "The Beginning After the End",
      imageUrl: "https://placehold.co/56x84/6a4af0/fff?text=TBATE",
      link: "http://localhost:3000/manga/2",
      description:
        "Um rei renasce em um mundo de magia e precisa reaprender o que significa viver.",
    },
    {
      title: "Omniscient Reader",
      imageUrl: "https://placehold.co/56x84/15151f/fff?text=ORV",
      link: "http://localhost:3000/manga/3",
      description:
        "O único leitor que terminou o romance vê a história virar realidade ao seu redor.",
    },
  ],
  newest: [
    {
      title: "Nano Machine",
      imageUrl: "https://placehold.co/56x84/9333ea/fff?text=NM",
      link: "http://localhost:3000/manga/4",
      description:
        "Uma nanomáquina do futuro transforma um discípulo desprezado em uma lenda das artes marciais.",
    },
    {
      title: "Return of the Mount Hua Sect",
      imageUrl: "https://placehold.co/56x84/7c5cff/fff?text=MH",
      link: "http://localhost:3000/manga/5",
      description:
        "O maior espadachim de sua era volta à vida cem anos depois para reerguer sua seita.",
    },
    {
      title: "The Greatest Estate Developer",
      link: "http://localhost:3000/manga/6",
      description:
        "Um engenheiro civil acorda dentro de um romance e decide construir o seu caminho ao topo.",
    },
  ],
  browseUrl: "http://localhost:3000/",
  unsubscribeUrl: "http://localhost:3000/api/newsletter/unsubscribe?token=demo",
} satisfies Props;

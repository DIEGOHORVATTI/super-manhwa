import { Column, Hr, Img, Link, Row, Section, Text } from "@react-email/components";

import Main from "../components/main";
import CtaButton from "../components/cta-button";
import { EmailStyles } from "../constants/styles";

export type DigestItem = { title: string; imageUrl?: string; link: string };

type Props = {
  trending: DigestItem[];
  newest: DigestItem[];
  browseUrl: string;
  unsubscribeUrl: string;
};

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
          margin: "0 0 10px",
        }}
      >
        {title}
      </Text>
      {items.map((it) => (
        <Row key={it.link} style={{ marginBottom: spacing.md }}>
          <Column style={{ width: "64px", verticalAlign: "top" }}>
            <Link href={it.link}>
              {it.imageUrl ? (
                <Img
                  src={it.imageUrl}
                  alt=""
                  width="56"
                  height="84"
                  style={{ borderRadius: radius.sm, objectFit: "cover" }}
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
              }}
            >
              {it.title}
            </Link>
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
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: "0 0 4px",
        }}
      >
        Destaques da semana
      </Text>
      <Text
        style={{ fontSize: typography.fontSize.base, color: colors.text.muted, margin: "0 0 18px" }}
      >
        O que está em alta e as novidades pra você ler.
      </Text>

      <Shelf title="🔥 Em tendência" items={trending} />
      <Hr style={{ borderColor: colors.border, margin: "14px 0" }} />
      <Shelf title="🆕 Novidades" items={newest} />

      <Section style={{ textAlign: "center", margin: "22px 0 6px" }}>
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
      imageUrl: "https://placehold.co/56x84",
      link: "http://localhost:3000/manga/1",
    },
    { title: "The Beginning After the End", link: "http://localhost:3000/manga/2" },
  ],
  newest: [{ title: "Omniscient Reader", link: "http://localhost:3000/manga/3" }],
  browseUrl: "http://localhost:3000/explorar",
  unsubscribeUrl: "http://localhost:3000/api/newsletter/unsubscribe?token=demo",
} satisfies Props;

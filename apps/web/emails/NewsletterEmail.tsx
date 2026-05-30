import { Button, Column, Hr, Img, Link, Row, Section, Text } from "@react-email/components";
import { EmailLayout } from "./Layout";
import { email } from "./theme";

export type DigestItem = { title: string; imageUrl?: string; link: string };

type Props = {
  trending: DigestItem[];
  newest: DigestItem[];
  browseUrl: string;
  unsubscribeUrl: string;
};

function Shelf({ title, items }: { title: string; items: DigestItem[] }) {
  if (items.length === 0) return null;
  return (
    <Section style={{ marginBottom: "8px" }}>
      <Text style={{ fontSize: "16px", fontWeight: 700, color: email.text, margin: "0 0 10px" }}>
        {title}
      </Text>
      {items.map((it) => (
        <Row key={it.link} style={{ marginBottom: "12px" }}>
          <Column style={{ width: "64px", verticalAlign: "top" }}>
            <Link href={it.link}>
              {it.imageUrl ? (
                <Img
                  src={it.imageUrl}
                  alt=""
                  width="56"
                  height="84"
                  style={{ borderRadius: "6px", objectFit: "cover" }}
                />
              ) : null}
            </Link>
          </Column>
          <Column style={{ verticalAlign: "top", paddingLeft: "12px" }}>
            <Link
              href={it.link}
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: email.text,
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

/** Weekly digest e-mail (trending + newest), rendered to HTML by the cron route. */
export function NewsletterEmail({ trending, newest, browseUrl, unsubscribeUrl }: Props) {
  return (
    <EmailLayout preview="Os destaques da semana no Super Manhwa">
      <Text style={{ fontSize: "16px", fontWeight: 700, color: email.text, margin: "0 0 4px" }}>
        Destaques da semana
      </Text>
      <Text style={{ fontSize: "13px", color: email.muted, margin: "0 0 18px" }}>
        O que está em alta e as novidades pra você ler.
      </Text>

      <Shelf title="🔥 Em tendência" items={trending} />
      <Hr style={{ borderColor: email.border, margin: "14px 0" }} />
      <Shelf title="🆕 Novidades" items={newest} />

      <Section style={{ textAlign: "center", margin: "22px 0 6px" }}>
        <Button
          href={browseUrl}
          style={{
            backgroundColor: email.accent,
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            padding: "11px 22px",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          Explorar o catálogo
        </Button>
      </Section>

      <Text
        style={{ fontSize: "11px", color: email.muted, textAlign: "center", marginTop: "12px" }}
      >
        <Link href={unsubscribeUrl} style={{ color: email.muted }}>
          Cancelar inscrição
        </Link>
      </Text>
    </EmailLayout>
  );
}

NewsletterEmail.PreviewProps = {
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

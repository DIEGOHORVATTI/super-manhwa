import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { email } from "./theme";

/** Shared shell for every transactional/newsletter e-mail. */
export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="pt-br">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: email.bg,
          margin: 0,
          padding: "24px 0",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <Container
          style={{
            backgroundColor: email.surface,
            borderRadius: email.radius,
            border: `1px solid ${email.border}`,
            maxWidth: "560px",
            margin: "0 auto",
            padding: "28px",
          }}
        >
          <Text
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: email.text,
              margin: "0 0 18px",
            }}
          >
            Super Manhwa<span style={{ color: email.accent }}>.</span>
          </Text>
          {children}
          <Section
            style={{
              marginTop: "26px",
              borderTop: `1px solid ${email.border}`,
              paddingTop: "14px",
            }}
          >
            <Text style={{ fontSize: "11px", color: email.muted, margin: 0 }}>
              Super Manhwa — leitor de mangás, manhwas e webtoons.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

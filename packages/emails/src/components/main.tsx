import { Body, Container, Head, Html, Preview, Section } from "@react-email/components";
import type { ReactNode } from "react";

import Header from "./header";
import Footer from "./footer";
import { darkModeCss } from "../constants/dark-mode";
import { EmailStyles } from "../constants/styles";

/** Casca compartilhada por todo e-mail transacional / newsletter. */
export default function Main({ preview, children }: { preview: string; children: ReactNode }) {
  const { colors, typography, radius, spacing, shadow } = EmailStyles;

  return (
    <Html lang="pt-br">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: darkModeCss }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        className="em-body"
        style={{
          backgroundColor: colors.background,
          margin: 0,
          padding: `${spacing["2xl"]} ${spacing.md}`,
          fontFamily: typography.fontFamily,
        }}
      >
        <Container
          className="em-card"
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadow,
            maxWidth: "560px",
            margin: "0 auto",
            overflow: "hidden",
          }}
        >
          <Header />
          <Section style={{ padding: spacing["3xl"] }}>{children}</Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

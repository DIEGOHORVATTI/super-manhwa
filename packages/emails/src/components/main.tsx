import { Body, Container, Head, Html, Preview } from "@react-email/components";
import type { ReactNode } from "react";

import Header from "./header";
import Footer from "./footer";
import { EmailStyles } from "../constants/styles";

/** Casca compartilhada por todo e-mail transacional / newsletter. */
export default function Main({ preview, children }: { preview: string; children: ReactNode }) {
  const { colors, typography, radius, spacing } = EmailStyles;

  return (
    <Html lang="pt-br">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          margin: 0,
          padding: `${spacing["2xl"]} 0`,
          fontFamily: typography.fontFamily,
        }}
      >
        <Container
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            maxWidth: "560px",
            margin: "0 auto",
            padding: spacing["3xl"],
          }}
        >
          <Header />
          {children}
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

import { Section, Text } from "@react-email/components";

import Main from "../components/main";
import CtaButton from "../components/cta-button";
import { EmailStyles } from "../constants/styles";

type Props = { url: string };

export default function VerificationEmail({ url }: Props) {
  const { colors, typography, spacing } = EmailStyles;

  return (
    <Main preview="Confirme seu e-mail no Super Manhwa">
      <Text
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: "0 0 8px",
        }}
      >
        Confirme seu e-mail
      </Text>
      <Text
        style={{
          fontSize: typography.fontSize.md,
          color: colors.text.muted,
          lineHeight: typography.lineHeight.normal,
          margin: "0 0 18px",
        }}
      >
        Bem-vindo à Super Manhwa! Toque no botão abaixo para ativar sua conta.
      </Text>
      <Section style={{ margin: `${spacing.sm} 0` }}>
        <CtaButton href={url}>Confirmar e-mail</CtaButton>
      </Section>
      <Text
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.muted,
          marginTop: spacing.lg,
        }}
      >
        Se não foi você, ignore este e-mail.
      </Text>
    </Main>
  );
}

VerificationEmail.PreviewProps = {
  url: "http://localhost:3000/api/auth/verify-email?token=demo",
} satisfies Props;

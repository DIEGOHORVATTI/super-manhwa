import { Section, Text } from "@react-email/components";

import Main from "../components/main";
import CtaButton from "../components/cta-button";
import { EmailStyles } from "../constants/styles";

type Props = { url: string };

export default function RecoverPasswordEmail({ url }: Props) {
  const { colors, typography, spacing } = EmailStyles;

  return (
    <Main preview="Redefina sua senha no Super Manhwa">
      <Text
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: "0 0 8px",
        }}
      >
        Redefinir sua senha
      </Text>
      <Text
        style={{
          fontSize: typography.fontSize.md,
          color: colors.text.muted,
          lineHeight: typography.lineHeight.normal,
          margin: "0 0 18px",
        }}
      >
        Recebemos um pedido para redefinir sua senha. Toque no botão abaixo para escolher uma nova.
      </Text>
      <Section style={{ margin: `${spacing.sm} 0` }}>
        <CtaButton href={url}>Redefinir senha</CtaButton>
      </Section>
      <Text
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.muted,
          marginTop: spacing.lg,
        }}
      >
        Se você não solicitou, ignore este e-mail | sua senha continua a mesma.
      </Text>
    </Main>
  );
}

RecoverPasswordEmail.PreviewProps = {
  url: "http://localhost:3000/api/auth/reset-password?token=demo",
} satisfies Props;

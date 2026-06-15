import { Section, Text } from "@react-email/components";

import Main from "../components/main";
import CtaButton from "../components/cta-button";
import { EmailStyles } from "../constants/styles";

type Props = { confirmUrl: string };

/** E-mail de confirmação (double opt-in) da newsletter. */
export default function ConfirmNewsletterEmail({ confirmUrl }: Props) {
  const { colors, typography, spacing } = EmailStyles;

  return (
    <Main preview="Confirme sua inscrição na newsletter do Super Manhwa">
      <Text
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: "0 0 8px",
        }}
      >
        Confirme sua inscrição
      </Text>
      <Text
        style={{
          fontSize: typography.fontSize.md,
          color: colors.text.muted,
          lineHeight: typography.lineHeight.normal,
          margin: "0 0 18px",
        }}
      >
        Toque no botão para confirmar que você quer receber os destaques da semana.
      </Text>
      <Section style={{ margin: `${spacing.sm} 0` }}>
        <CtaButton href={confirmUrl}>Confirmar inscrição</CtaButton>
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

ConfirmNewsletterEmail.PreviewProps = {
  confirmUrl: "http://localhost:3000/api/newsletter/confirm?token=demo",
} satisfies Props;

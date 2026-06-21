import { Section, Text } from "@react-email/components";

import Main from "../components/main";
import CtaButton from "../components/cta-button";
import { EmailStyles } from "../constants/styles";

type Props = { url: string; orgName: string; role: string };

/** Convite para entrar numa Organização (scan/estúdio) com um cargo. */
export default function OrgInviteEmail({ url, orgName, role }: Props) {
  const { colors, typography, spacing } = EmailStyles;

  return (
    <Main preview={`Convite para ${orgName} no Super Manhwa`}>
      <Text
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: "0 0 8px",
        }}
      >
        Você foi convidado para {orgName}
      </Text>
      <Text
        style={{
          fontSize: typography.fontSize.md,
          color: colors.text.muted,
          lineHeight: typography.lineHeight.normal,
          margin: "0 0 18px",
        }}
      >
        Entre como <strong>{role}</strong> e ajude a equipe a traduzir e publicar obras.
      </Text>
      <Section style={{ margin: `${spacing.sm} 0` }}>
        <CtaButton href={url}>Aceitar convite</CtaButton>
      </Section>
      <Text
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.muted,
          marginTop: spacing.lg,
        }}
      >
        Se não esperava este convite, ignore este e-mail.
      </Text>
    </Main>
  );
}

OrgInviteEmail.PreviewProps = {
  url: "http://localhost:3000/orgs/invite/demo",
  orgName: "Lua Cheia Scans",
  role: "Tradutor",
} satisfies Props;

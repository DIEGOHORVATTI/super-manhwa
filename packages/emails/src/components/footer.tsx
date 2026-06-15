import { Section, Text } from "@react-email/components";

import { EmailStyles } from "../constants/styles";

export default function Footer() {
  const { colors, typography, spacing } = EmailStyles;

  return (
    <Section
      style={{
        marginTop: spacing["2xl"],
        borderTop: `1px solid ${colors.border}`,
        paddingTop: spacing.md,
      }}
    >
      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, margin: 0 }}>
        Super Manhwa | leitor de mangás, manhwas e webtoons.
      </Text>
    </Section>
  );
}

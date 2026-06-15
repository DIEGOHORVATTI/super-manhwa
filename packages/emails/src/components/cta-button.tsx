import { Button } from "@react-email/components";

import { EmailStyles } from "../constants/styles";

/** Botão de ação com o acento da marca, reusado pelas views. */
export default function CtaButton({ href, children }: { href: string; children: string }) {
  const { colors, typography, radius, spacing } = EmailStyles;

  return (
    <Button
      href={href}
      className="em-btn"
      style={{
        backgroundColor: colors.accent,
        color: colors.text.white,
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
        padding: `${spacing.md} ${spacing.xl}`,
        borderRadius: radius.md,
        textDecoration: "none",
      }}
    >
      {children}
    </Button>
  );
}

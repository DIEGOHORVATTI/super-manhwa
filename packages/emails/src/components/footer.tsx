import { Link, Section, Text } from "@react-email/components";
import { Fragment } from "react";

import { Brand } from "../constants/brand";
import { EmailStyles } from "../constants/styles";

export default function Footer() {
  const { colors, typography, spacing } = EmailStyles;
  const year = new Date().getFullYear();

  const linkStyle = {
    color: colors.bandLink,
    fontSize: typography.fontSize.sm,
    textDecoration: "none",
  } as const;
  const sep = {
    color: colors.bandText,
    fontSize: typography.fontSize.sm,
    padding: "0 8px",
  } as const;

  return (
    <Section
      style={{
        backgroundColor: colors.band,
        padding: `${spacing.xl} ${spacing.lg}`,
        textAlign: "center",
        borderTop: `1px solid #26263a`,
      }}
    >
      <Text style={{ margin: "0 0 8px" }}>
        {Brand.footerLinks.map((l, i) => (
          <Fragment key={l.path}>
            {i > 0 && <span style={sep}>·</span>}
            <Link href={`${Brand.siteUrl}${l.path}`} style={linkStyle}>
              {l.label}
            </Link>
          </Fragment>
        ))}
      </Text>

      <Text style={{ margin: "0 0 14px" }}>
        {Brand.legalLinks.map((l, i) => (
          <Fragment key={l.path}>
            {i > 0 && <span style={sep}>·</span>}
            <Link
              href={`${Brand.siteUrl}${l.path}`}
              style={{ ...linkStyle, fontSize: typography.fontSize.xs }}
            >
              {l.label}
            </Link>
          </Fragment>
        ))}
      </Text>

      <Text style={{ fontSize: typography.fontSize.xs, color: colors.bandText, margin: 0 }}>
        {Brand.tagline}
      </Text>
      <Text style={{ fontSize: typography.fontSize.xs, color: colors.bandText, margin: "4px 0 0" }}>
        © {year} Super Manhwa. Todos os direitos reservados.
      </Text>
    </Section>
  );
}

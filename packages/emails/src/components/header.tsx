import { Img, Section } from "@react-email/components";

import { Brand } from "../constants/brand";
import { EmailStyles } from "../constants/styles";

export default function Header() {
  const { colors, spacing } = EmailStyles;

  return (
    <Section
      style={{
        backgroundColor: colors.band,
        padding: `${spacing["2xl"]} ${spacing.xl}`,
        textAlign: "center",
        borderBottom: `3px solid ${colors.accent}`,
      }}
    >
      <Img
        src={Brand.logoUrl}
        alt="Super Manhwa"
        height="40"
        style={{ height: "40px", width: "auto", margin: "0 auto" }}
      />
    </Section>
  );
}

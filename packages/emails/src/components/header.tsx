import { Text } from "@react-email/components";

import { EmailStyles } from "../constants/styles";

export default function Header() {
  const { colors, typography } = EmailStyles;

  return (
    <Text
      style={{
        fontSize: typography.fontSize["2xl"],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        margin: "0 0 18px",
      }}
    >
      Super Manhwa<span style={{ color: colors.accent }}>.</span>
    </Text>
  );
}

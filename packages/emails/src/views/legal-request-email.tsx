import { Text } from "@react-email/components";

import Main from "../components/main";
import { EmailStyles } from "../constants/styles";

type Props = {
  type: string;
  /** Pares campo/valor da submissão (ex.: Object.entries do payload). */
  fields: [string, string][];
};

/** Notificação ao admin de uma nova solicitação (DMCA / contato). */
export default function LegalRequestEmail({ type, fields }: Props) {
  const { colors, typography, spacing } = EmailStyles;

  return (
    <Main preview={`Nova solicitação (${type}) — Super Manhwa`}>
      <Text
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: "0 0 16px",
        }}
      >
        Nova solicitação ({type})
      </Text>
      {fields.map(([k, v]) => (
        <Text
          key={k}
          style={{
            fontSize: typography.fontSize.md,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.normal,
            margin: `0 0 ${spacing.md}`,
          }}
        >
          <strong style={{ color: colors.text.primary }}>{k}:</strong>
          <br />
          {v}
        </Text>
      ))}
    </Main>
  );
}

LegalRequestEmail.PreviewProps = {
  type: "dmca",
  fields: [
    ["nome", "João Silva"],
    ["email", "joao@example.com"],
    ["mensagem", "Conteúdo protegido por direitos autorais na obra X."],
  ],
} satisfies Props;

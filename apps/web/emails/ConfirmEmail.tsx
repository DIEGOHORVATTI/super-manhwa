import { Button, Text } from "@react-email/components";
import { EmailLayout } from "./Layout";
import { email } from "./theme";

/** Double opt-in confirmation e-mail. */
export function ConfirmEmail({ confirmUrl }: { confirmUrl: string }) {
  return (
    <EmailLayout preview="Confirme sua inscrição na newsletter do Super Manhwa">
      <Text style={{ fontSize: "16px", fontWeight: 700, color: email.text, margin: "0 0 8px" }}>
        Confirme sua inscrição
      </Text>
      <Text style={{ fontSize: "14px", color: email.muted, lineHeight: "1.5", margin: "0 0 18px" }}>
        Toque no botão para confirmar que você quer receber os destaques da semana.
      </Text>
      <Button
        href={confirmUrl}
        style={{
          backgroundColor: email.accent,
          color: "#fff",
          fontSize: "14px",
          fontWeight: 600,
          padding: "11px 20px",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        Confirmar inscrição
      </Button>
      <Text style={{ fontSize: "12px", color: email.muted, marginTop: "18px" }}>
        Se não foi você, ignore este e-mail.
      </Text>
    </EmailLayout>
  );
}

ConfirmEmail.PreviewProps = {
  confirmUrl: "http://localhost:3000/api/newsletter/confirm?token=demo",
};

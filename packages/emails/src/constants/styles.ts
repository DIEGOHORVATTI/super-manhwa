/**
 * Design tokens compartilhados por todos os templates de e-mail. Mantidos
 * inline-friendly (clientes de e-mail exigem estilos inline). Paleta clara para
 * compatibilidade ampla, com o roxo da marca como acento.
 */
export const EmailStyles = {
  colors: {
    accent: "#7c5cff",
    accentDark: "#6a4af0",
    background: "#f4f4f7",
    surface: "#ffffff",
    text: {
      primary: "#15151f",
      secondary: "#374151",
      muted: "#6b7280",
      light: "#9ca3af",
      white: "#ffffff",
    },
    warning: "#b45309",
    error: "#dc2626",
    border: "#e5e7eb",
  },
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: {
      xs: "11px",
      sm: "12px",
      base: "13px",
      md: "14px",
      lg: "16px",
      xl: "18px",
      "2xl": "20px",
      "3xl": "24px",
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    lineHeight: {
      tight: "1.2",
      normal: "1.5",
      relaxed: "1.6",
    },
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "32px",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "10px",
    xl: "12px",
  },
} as const;

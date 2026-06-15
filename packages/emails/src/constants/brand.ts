/** Identidade da marca usada nos e-mails (logo, URL pública, links de rodapé). */
export const Brand = {
  siteUrl: "https://supermanhwa.com",
  logoUrl: "https://supermanhwa.com/white_logo_super_manhuwa.png",
  tagline: "Leitor de mangás, manhwas e webtoons.",
  /** Links do rodapé — caminhos relativos resolvidos contra `siteUrl`. */
  footerLinks: [
    { label: "Início", path: "/" },
    { label: "Biblioteca", path: "/library" },
    { label: "Doar", path: "/doar" },
    { label: "Sobre", path: "/about" },
    { label: "Contato", path: "/contact" },
  ],
  legalLinks: [
    { label: "Privacidade", path: "/privacy" },
    { label: "Termos", path: "/terms" },
    { label: "DMCA", path: "/dmca" },
  ],
} as const;

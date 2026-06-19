import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { routes } from "@/lib/routes";

const YEAR = new Date().getFullYear();

const SOCIALS: ReadonlyArray<{ label: string; href: string; icon: React.ReactNode }> = [
  {
    label: "Discord",
    href: process.env.NEXT_PUBLIC_DISCORD_URL ?? "#",
    icon: (
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.25.5a14.6 14.6 0 0 1 4.2 1.7c-2.1-1-4.3-1.5-6.5-1.5-2.2 0-4.4.5-6.5 1.5a14.6 14.6 0 0 1 4.2-1.7L10.3 3a19.8 19.8 0 0 0-4.9 1.4C2.2 9.2 1.4 13.9 1.8 18.5a19.9 19.9 0 0 0 6 3l.5-.7c-1-.3-2-.8-2.9-1.4l.2-.2c3.7 1.7 7.7 1.7 11.4 0l.2.2c-.9.6-1.9 1.1-2.9 1.4l.5.7a19.9 19.9 0 0 0 6-3c.5-5.3-.8-10-3.2-14.1ZM8.5 15.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    ),
  },
  // ponytail: outras redes comentadas a pedido — só Discord ativo
  // {
  //   label: "Twitter",
  //   href: "#",
  //   icon: (
  //     <path d="M18.9 3h3.3l-7.2 8.3L23.5 21h-6.6l-5.2-6.8L5.8 21H2.5l7.7-8.8L2 3h6.8l4.7 6.2L18.9 3Zm-1.2 16h1.8L7.1 4.8H5.2L17.7 19Z" />
  //   ),
  // },
  // {
  //   label: "Reddit",
  //   href: "#",
  //   icon: (
  //     <path d="M22 12.1a2.1 2.1 0 0 0-3.6-1.4 10.3 10.3 0 0 0-5.3-1.7l.9-4.2 3 .6a1.5 1.5 0 1 0 .2-1l-3.4-.7a.5.5 0 0 0-.6.4l-1 4.6a10.3 10.3 0 0 0-5.4 1.7 2.1 2.1 0 1 0-2.3 3.4 4 4 0 0 0 0 .6c0 3.2 3.7 5.7 8.3 5.7s8.3-2.5 8.3-5.7a4 4 0 0 0 0-.6 2.1 2.1 0 0 0 .9-1.7ZM7 13.7a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm8.4 4c-1 1-3.2 1.1-3.9 1.1-.7 0-2.9-.1-3.9-1.1a.4.4 0 0 1 .6-.6c.6.6 2 .9 3.3.9 1.3 0 2.7-.3 3.3-.9a.4.4 0 1 1 .6.6Zm-.3-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
  //   ),
  // },
  // {
  //   label: "Instagram",
  //   href: "#",
  //   icon: (
  //     <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.8-11.2a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z" />
  //   ),
  // },
  // {
  //   label: "GitHub",
  //   href: "https://github.com",
  //   icon: (
  //     <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.6 4.9.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
  //   ),
  // },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href={routes.home} className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/white_logo_super_manhuwa.png" alt="" />
            <span className="brand-name brand-name-lg">
              Super Manhwa<span className="dot">.</span>
            </span>
          </Link>
          <p className="muted">
            Uma base completa de mangás, manhwas e webtoons feita para facilitar sua leitura em
            várias fontes.
          </p>
          <div className="footer-socials">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                title={s.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                  {s.icon}
                </svg>
              </a>
            ))}
          </div>
          <NewsletterSignup />
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_URL ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-discord"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.25.5a14.6 14.6 0 0 1 4.2 1.7c-2.1-1-4.3-1.5-6.5-1.5-2.2 0-4.4.5-6.5 1.5a14.6 14.6 0 0 1 4.2-1.7L10.3 3a19.8 19.8 0 0 0-4.9 1.4C2.2 9.2 1.4 13.9 1.8 18.5a19.9 19.9 0 0 0 6 3l.5-.7c-1-.3-2-.8-2.9-1.4l.2-.2c3.7 1.7 7.7 1.7 11.4 0l.2.2c-.9.6-1.9 1.1-2.9 1.4l.5.7a19.9 19.9 0 0 0 6-3c.5-5.3-.8-10-3.2-14.1ZM8.5 15.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
            </svg>
            Entrar no Discord
          </a>
          <Link href={routes.donate} className="footer-donate">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M12 21s-7.5-4.6-10-9.2C.5 8.4 2.2 5 5.5 5c1.9 0 3.3 1 4.5 2.4C11.2 6 12.6 5 14.5 5 17.8 5 19.5 8.4 22 11.8 19.5 16.4 12 21 12 21Z" />
            </svg>
            Apoiar via Pix
          </Link>
        </div>

        <nav className="footer-col" aria-label="Explorar">
          <h3>Explorar</h3>
          <Link href={routes.home}>Início</Link>
          <Link href={`${routes.home}?sort=trending`}>Tendência</Link>
          <Link href={`${routes.home}?sort=newest`}>Mais novos</Link>
          <Link href={routes.library}>Biblioteca</Link>
        </nav>

        <nav className="footer-col" aria-label="Comunidade">
          <h3>Comunidade</h3>
          <Link href={routes.about}>Sobre nós</Link>
          <Link href={routes.contact}>Contato</Link>
          <Link href={routes.donate}>Doar</Link>
        </nav>

        <nav className="footer-col" aria-label="Legal">
          <h3>Legal</h3>
          <Link href={routes.privacy}>Política de Privacidade</Link>
          <Link href={routes.terms}>Termos de Serviço</Link>
          <Link href={routes.dmca}>DMCA</Link>
          <Link href={routes.cookies}>Política de Cookies</Link>
        </nav>
      </div>

      <div className="footer-copy">© {YEAR} Super Manhwa. Todos os direitos reservados.</div>
    </footer>
  );
}

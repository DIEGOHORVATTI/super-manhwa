import Link from "next/link";

import type { WallDonation } from "@/lib/donations-wall";
import { routes } from "@/lib/routes";

const brl = (cents: number) => `R$${(cents / 100).toFixed(2)}`;
const when = (d: Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Public donations wall (Ko-fi-style supporters feed) | approved donations with
 * the donor's name, amount, optional message and date. Server-rendered.
 */
export function DonationWall({ donations }: { donations: WallDonation[] }) {
  if (donations.length === 0) return null;
  return (
    <section className="donate-wall">
      <h2 className="section">Quem já apoiou 💜</h2>
      <ul className="donate-wall-list">
        {donations.map((d) => {
          const avatar = (
            <span className="donate-wall-avatar" aria-hidden="true">
              {d.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.image} alt="" />
              ) : (
                <span>{d.name.charAt(0).toUpperCase()}</span>
              )}
            </span>
          );
          // An attributed account links its avatar + name to its public profile.
          const nameNode = d.handle ? (
            <Link href={routes.user(d.handle)} className="donate-wall-name">
              {d.name}
            </Link>
          ) : (
            <strong>{d.name}</strong>
          );
          return (
            <li key={d.id} className="donate-wall-item">
              {d.handle ? <Link href={routes.user(d.handle)}>{avatar}</Link> : avatar}
              <div className="donate-wall-body">
                <p className="donate-wall-head">
                  {nameNode} apoiou com <strong>{brl(d.amountCents)}</strong>
                  <span className="muted"> · {when(d.createdAt)}</span>
                </p>
                {d.message && <p className="donate-wall-msg">{d.message}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

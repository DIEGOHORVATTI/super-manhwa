import type { Metadata } from "next";
import Link from "next/link";

import { DonateView } from "@/components/DonateView";
import { DonationWall } from "@/components/DonationWall";
import { loadDonationWall } from "@/lib/donations-wall";
import { donationsEnabled } from "@/lib/flags";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Doar",
  description: "Apoie a Super Manhwa com uma doação via Pix.",
};

export default async function DonatePage() {
  if (!donationsEnabled) {
    return (
      <div className="donate-wrap">
        <h1 className="donate-title">Doações indisponíveis</h1>
        <p className="donate-sub">
          As doações estão temporariamente desativadas. Volte em breve —{" "}
          <Link href={routes.home}>voltar ao início</Link>.
        </p>
      </div>
    );
  }

  const donations = await loadDonationWall();
  return (
    <>
      <DonateView />
      <div className="donate-wrap">
        <DonationWall donations={donations} />
      </div>
    </>
  );
}

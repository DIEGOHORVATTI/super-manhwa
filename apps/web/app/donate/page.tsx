import type { Metadata } from "next";

import { DonateView } from "@/components/DonateView";
import { DonationWall } from "@/components/DonationWall";
import { loadDonationWall } from "@/lib/donations-wall";

export const metadata: Metadata = {
  title: "Doar",
  description: "Apoie a Super Manhwa com uma doação via Pix.",
};

export default async function DonatePage() {
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

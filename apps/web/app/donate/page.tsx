import type { Metadata } from "next";

import { DonateView } from "@/components/DonateView";
import { DonationGoal } from "@/components/DonationGoal";
import { DonationWall } from "@/components/DonationWall";
import { loadDonationGoal } from "@/lib/donation-goal";
import { loadDonationWall } from "@/lib/donations-wall";

export const metadata: Metadata = {
  title: "Doar",
  description: "Apoie a Super Manhwa com uma doação via Pix.",
};

export default async function DonatePage() {
  const [donations, goal] = await Promise.all([loadDonationWall(), loadDonationGoal()]);
  return (
    <div className="donate-layout">
      <div className="donate-main">
        <DonateView />
        <DonationWall donations={donations} />
      </div>
      <aside className="donate-side">
        <DonationGoal goal={goal} />
      </aside>
    </div>
  );
}

import type { Metadata } from "next";

import { DonateView } from "@/components/DonateView";

export const metadata: Metadata = {
  title: "Doar",
  description: "Apoie a Super Manhwa com uma doação via Pix.",
};

export default function DonatePage() {
  return <DonateView />;
}

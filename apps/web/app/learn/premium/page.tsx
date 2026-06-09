import type { Metadata } from "next";

import { PremiumUpsell } from "@/components/learn/PremiumUpsell";

export const metadata: Metadata = { title: "Premium" };

export default function PremiumPage() {
  return <PremiumUpsell />;
}

import type { Metadata } from "next";

import { AffiliateView } from "@/components/AffiliateView";

export const metadata: Metadata = { title: "Programa de afiliados" };

export default function AffiliatePage() {
  return <AffiliateView />;
}

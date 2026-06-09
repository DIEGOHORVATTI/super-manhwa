import type { Metadata } from "next";

import { StudioDashboard } from "@/components/studio/StudioDashboard";

export const metadata: Metadata = { title: "Studio" };

export default function StudioPage() {
  return <StudioDashboard />;
}

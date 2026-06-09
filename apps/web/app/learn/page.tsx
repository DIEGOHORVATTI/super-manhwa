import type { Metadata } from "next";

import { LearnDashboard } from "@/components/learn/LearnDashboard";

export const metadata: Metadata = { title: "Aprender" };

export default function LearnPage() {
  return <LearnDashboard />;
}

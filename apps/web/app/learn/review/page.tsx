import type { Metadata } from "next";

import { ReviewSession } from "@/components/learn/ReviewSession";

export const metadata: Metadata = { title: "Revisão", robots: { index: false } };

export default function ReviewPage() {
  return <ReviewSession />;
}

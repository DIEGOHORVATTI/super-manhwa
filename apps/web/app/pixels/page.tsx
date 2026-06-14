import type { Metadata } from "next";

import { PixelBoard } from "@/components/pixels/PixelBoard";

export const metadata: Metadata = {
  title: "Espaço publicitário (pixels)",
  description: "Compre seu espaço na grade de pixels da Super Manhwa — sua marca eternizada.",
};

export default function PixelsPage() {
  return <PixelBoard />;
}

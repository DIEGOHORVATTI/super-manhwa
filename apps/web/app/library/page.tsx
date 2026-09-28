import type { Metadata } from "next";
import { LibraryView } from "@/components/LibraryView";

export const metadata: Metadata = {
  title: "Biblioteca | Super Novel",
  description: "Suas obras salvas e leituras em andamento, guardadas neste navegador.",
  robots: { index: false },
};

export default function BibliotecaPage() {
  return <LibraryView />;
}

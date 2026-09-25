import type { Metadata } from "next";

import { BrowseView } from "@/components/novel/BrowseView";
import { parseBrowseState } from "@/lib/catalog/browse-state";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home({ searchParams }: HomeProps) {
  const state = parseBrowseState(await searchParams);

  return <BrowseView state={state} />;
}

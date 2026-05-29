import { PosterGridSkeleton } from "@/components/Skeleton";

/** Default route loading state (home + any route without its own loading.tsx). */
export default function Loading() {
  return <PosterGridSkeleton />;
}

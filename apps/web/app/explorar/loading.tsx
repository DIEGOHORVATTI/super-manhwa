import { PosterGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <div className="skel skel-line" style={{ width: 140, height: 26, margin: "0 0 16px" }} />
      <PosterGridSkeleton />
    </>
  );
}

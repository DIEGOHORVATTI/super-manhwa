"use client";

import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import dynamic from "next/dynamic";

function ReaderSkeleton() {
  return (
    <Stack spacing={1.5} sx={{ maxWidth: 900, mx: "auto" }}>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={72} />
      ))}
    </Stack>
  );
}

// ponytail: client-only because voices, settings and resume position live in the browser.
export const ChapterReaderLoader = dynamic(
  () => import("./ChapterReader").then((module) => module.ChapterReader),
  { ssr: false, loading: ReaderSkeleton },
);

"use client";

import HeadphonesRoundedIcon from "@mui/icons-material/HeadphonesRounded";
import Button from "@mui/material/Button";
import Link from "next/link";

import { useHistory } from "@/lib/library";
import { routes } from "@/lib/routes";

type StartReadingButtonProps = {
  novelSlug: string;
  firstChapterSlug?: string;
};

export function StartReadingButton({ novelSlug, firstChapterSlug }: StartReadingButtonProps) {
  const saved = useHistory().find((entry) => entry.id === novelSlug);
  const target = saved?.chapterId ?? firstChapterSlug;
  if (!target) return null;

  return (
    <Button
      component={Link}
      href={routes.read(target)}
      variant="contained"
      color="primary"
      size="large"
      startIcon={<HeadphonesRoundedIcon />}
    >
      {saved ? `Continuar: ${saved.chapterName ?? "de onde parou"}` : "Começar a ler"}
    </Button>
  );
}

"use client";

import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import { useSession } from "@/lib/auth/client";
import { toggleFavorite, useIsFavorite } from "@/lib/library";
import { dbFavorite } from "@/lib/library-db";

type FavoriteToggleProps = {
  slug: string;
  title: string;
  cover?: string;
  compact?: boolean;
};

export function FavoriteToggle({ slug, title, cover, compact = false }: FavoriteToggleProps) {
  const isFavorite = useIsFavorite(slug);
  const { data: session } = useSession();

  const toggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite({ id: slug, name: title, imageUrl: cover });
    if (session?.user) dbFavorite({ workId: slug, name: title, imageUrl: cover }, !isFavorite);
  };

  const label = isFavorite ? "Remover da biblioteca" : "Adicionar à biblioteca";
  const icon = isFavorite ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />;

  if (compact) {
    return (
      <Tooltip title={label}>
        <IconButton
          size="small"
          onClick={toggle}
          aria-pressed={isFavorite}
          aria-label={label}
          sx={{
            bgcolor: "rgba(13, 13, 13, 0.72)",
            color: isFavorite ? "error.main" : "common.white",
            "&:hover": { bgcolor: "rgba(13, 13, 13, 0.9)" },
          }}
        >
          {icon}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={isFavorite ? "soft" : "outlined"}
      color={isFavorite ? "error" : "inherit"}
      startIcon={icon}
      onClick={toggle}
      aria-pressed={isFavorite}
    >
      {isFavorite ? "Na biblioteca" : "Favoritar"}
    </Button>
  );
}

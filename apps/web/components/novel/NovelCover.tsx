import type { SxProps, Theme } from "@mui/material/styles";

import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import Box from "@mui/material/Box";

type NovelCoverProps = {
  src?: string;
  title: string;
  sx?: SxProps<Theme>;
};

const frame = {
  width: "100%",
  aspectRatio: "151 / 215",
  borderRadius: 1.5,
  display: "block",
  objectFit: "cover",
  bgcolor: "background.neutral",
} as const;

export function NovelCover({ src, title, sx }: NovelCoverProps) {
  const extra = Array.isArray(sx) ? sx : [sx];

  if (!src) {
    return (
      <Box
        role="img"
        aria-label={title}
        sx={[{ ...frame, display: "grid", placeItems: "center", color: "text.disabled" }, ...extra]}
      >
        <MenuBookRoundedIcon />
      </Box>
    );
  }

  return <Box component="img" src={src} alt={title} loading="lazy" sx={[frame, ...extra]} />;
}

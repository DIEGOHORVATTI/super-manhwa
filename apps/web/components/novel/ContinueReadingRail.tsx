"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Box from "@mui/material/Box";
import CardActionArea from "@mui/material/CardActionArea";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { removeProgress, useHistory } from "@/lib/library";
import { routes } from "@/lib/routes";

import { NovelCover } from "./NovelCover";

export function ContinueReadingRail() {
  const history = useHistory();
  if (history.length === 0) return null;

  return (
    <Stack spacing={1.5} component="section" aria-label="Continuar ouvindo">
      <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryRoundedIcon fontSize="small" /> Continuar ouvindo
      </Typography>
      <Box
        component="ul"
        sx={{
          display: "grid",
          minWidth: 0,
          gridAutoFlow: "column",
          gridAutoColumns: { xs: "38%", sm: "22%", md: "15%" },
          gap: 2,
          overflowX: "auto",
          p: 0,
          m: 0,
          listStyle: "none",
          scrollSnapType: "x mandatory",
        }}
      >
        {history.map((entry) => (
          <Box
            component="li"
            key={entry.id}
            sx={{ position: "relative", scrollSnapAlign: "start" }}
          >
            <CardActionArea
              component={Link}
              href={routes.read(entry.chapterId)}
              sx={{ borderRadius: 1.5, p: 0.5 }}
            >
              <NovelCover src={entry.imageUrl} title={entry.name} />
              <Typography variant="subtitle2" noWrap sx={{ pt: 1, px: 0.5 }}>
                {entry.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ display: "block", px: 0.5 }}
              >
                {entry.chapterName ??
                  (entry.chapterNo ? `Capítulo ${entry.chapterNo}` : "Continuar")}
              </Typography>
            </CardActionArea>
            <IconButton
              size="small"
              aria-label={`Remover ${entry.name} do histórico`}
              onClick={() => removeProgress(entry.id)}
              sx={{ position: "absolute", top: 10, right: 10, bgcolor: "rgba(20, 26, 33, 0.72)" }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}

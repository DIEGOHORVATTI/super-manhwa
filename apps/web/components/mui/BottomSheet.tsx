"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Typography from "@mui/material/Typography";

type BottomSheetProps = React.PropsWithChildren<{
  open: boolean;
  title?: string;
  onClose: () => void;
}>;

const noop = () => {};

/** Sheet that slides up from the bottom; drag the handle down (or tap outside) to close. */
export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={noop}
      disableSwipeToOpen
      slotProps={{
        paper: {
          sx: {
            maxHeight: "90dvh",
            width: "min(100%, 640px)",
            mx: "auto",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundImage: "none",
            pb: "max(16px, env(safe-area-inset-bottom))",
          },
        },
      }}
    >
      <Box
        sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mt: 1.5 }}
      />
      {title && (
        <Stack direction="row" alignItems="center" sx={{ px: 2.5, pt: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }} noWrap>
            {title}
          </Typography>
          <IconButton onClick={onClose} aria-label="Fechar" edge="end">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      )}
      <Box sx={{ px: 2.5, pt: title ? 1 : 2, overflowY: "auto" }}>{children}</Box>
    </SwipeableDrawer>
  );
}

import type { Theme, Components } from "@mui/material/styles";

import { listClasses } from "@mui/material/List";

const MuiPopover: Components<Theme>["MuiPopover"] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    paper: ({ theme }) => ({
      ...theme.mixins.paperStyles(theme, { dropdown: true }),
      [`& .${listClasses.root}`]: {
        paddingTop: 0,
        paddingBottom: 0,
      },
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const popover: Components<Theme> = {
  MuiPopover,
};

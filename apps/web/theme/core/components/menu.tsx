import type { Theme, Components } from "@mui/material/styles";

const MuiMenuItem: Components<Theme>["MuiMenuItem"] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      ...theme.mixins.menuItemStyles(theme),
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const menu: Components<Theme> = {
  MuiMenuItem,
};

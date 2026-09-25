import type { Theme, Components } from "@mui/material/styles";

const MuiAppBar: Components<Theme>["MuiAppBar"] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    color: "transparent",
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: { boxShadow: "none" },
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const appBar: Components<Theme> = {
  MuiAppBar,
};

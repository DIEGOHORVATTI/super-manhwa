"use client";

import type { NovelSummary } from "@/lib/catalog/types";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { varAlpha } from "minimal-shared/utils";
import { useDebounce } from "minimal-shared/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { routes } from "@/lib/routes";

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")
  );
}

export function NovelSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<NovelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const query = useDebounce(input.trim(), 250);

  useEffect(() => {
    const focusOnSlash = (event: KeyboardEvent) => {
      if (event.key !== "/" || isTyping(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", focusOnSlash);
    return () => window.removeEventListener("keydown", focusOnSlash);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`${routes.api.novelSuggest}?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<{ list: NovelSummary[] }>)
      .then((data) => setOptions(data.list))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      filterOptions={(all) => all}
      loading={loading}
      inputValue={input}
      onInputChange={(_, value) => setInput(value)}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.title)}
      isOptionEqualToValue={(option, value) => option.slug === value.slug}
      noOptionsText={query.length < 2 ? "Digite o nome da novel" : "Nenhuma novel encontrada"}
      onChange={(_, value) => {
        if (!value) return;
        router.push(
          typeof value === "string" ? routes.browse({ q: value }) : routes.novel(value.slug),
        );
        setInput("");
        inputRef.current?.blur();
      }}
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props}>
          <Avatar
            variant="rounded"
            src={option.cover}
            alt=""
            sx={{ width: 36, height: 50, mr: 1.5 }}
          />
          <ListItemText
            primary={option.title}
            secondary={option.genres.slice(0, 3).join(" · ")}
            slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
          />
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          placeholder="Buscar novels"
          aria-label="Buscar novels"
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <CircularProgress size={18} />
              ) : (
                <Box
                  component="kbd"
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    typography: "caption",
                    fontFamily: "inherit",
                    color: "text.disabled",
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  /
                </Box>
              ),
            },
          }}
          sx={(theme) => ({
            "& .MuiOutlinedInput-root": {
              height: 44,
              borderRadius: 99,
              bgcolor: varAlpha(theme.vars.palette.grey["500Channel"], 0.12),
              transition: theme.transitions.create(["background-color", "box-shadow"]),
              "& fieldset": { borderColor: "transparent" },
              "&:hover fieldset": { borderColor: theme.vars.palette.text.disabled },
              "&.Mui-focused": {
                bgcolor: "background.paper",
                boxShadow: theme.vars.customShadows.z8,
              },
              "&.Mui-focused fieldset": { borderColor: theme.vars.palette.primary.main },
            },
          })}
        />
      )}
      slotProps={{ paper: { sx: { mt: 1, borderRadius: 2 } } }}
      sx={{ width: "100%" }}
    />
  );
}

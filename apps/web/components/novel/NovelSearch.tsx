"use client";

import type { NovelSummary } from "@/lib/catalog/types";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { useDebounce } from "minimal-shared/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { routes } from "@/lib/routes";

export function NovelSearch() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<NovelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const query = useDebounce(input.trim(), 250);

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
      size="small"
      options={options}
      filterOptions={(all) => all}
      loading={loading}
      inputValue={input}
      onInputChange={(_, value) => setInput(value)}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.title)}
      isOptionEqualToValue={(option, value) => option.slug === value.slug}
      onChange={(_, value) => {
        if (!value) return;
        router.push(
          typeof value === "string" ? routes.browse({ q: value }) : routes.novel(value.slug),
        );
        setInput("");
      }}
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props}>
          <Avatar
            variant="rounded"
            src={option.cover}
            alt=""
            sx={{ width: 32, height: 44, mr: 1.5 }}
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
          placeholder="Buscar novel"
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: loading ? <CircularProgress size={16} /> : null,
            },
          }}
        />
      )}
      sx={{ width: "100%" }}
    />
  );
}

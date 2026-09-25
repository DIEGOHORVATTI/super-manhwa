"use client";

import type { Theme, SxProps } from "@mui/material/styles";

import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

export type SelectOption<Value extends string | number> = {
  value: Value;
  label: string;
  group?: string;
};

type SelectAutocompleteProps<Value extends string | number> = {
  label?: string;
  value: Value;
  options: SelectOption<Value>[];
  onChange: (value: Value) => void;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
};

export function SelectAutocomplete<Value extends string | number>({
  label,
  value,
  options,
  onChange,
  size = "small",
  sx,
}: SelectAutocompleteProps<Value>) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Autocomplete
      disableClearable
      size={size}
      value={selected as SelectOption<Value>}
      options={options}
      groupBy={options.some((option) => option.group) ? (option) => option.group ?? "" : undefined}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, current) => option.value === current.value}
      onChange={(_, option) => option && onChange(option.value)}
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={sx}
    />
  );
}

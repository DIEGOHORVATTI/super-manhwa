"use client";

import { useState, useCallback } from "react";

function read<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Não foi possível salvar "${key}"`, error);
  }
}

export function useStoredState<T extends object>(key: string, fallback: T) {
  const [state, setFullState] = useState(() => read(key, fallback));

  const setState = useCallback(
    (patch: Partial<T>) =>
      setFullState((previous) => {
        const next = { ...previous, ...patch };
        persist(key, next);
        return next;
      }),
    [key],
  );

  return { state, setState };
}

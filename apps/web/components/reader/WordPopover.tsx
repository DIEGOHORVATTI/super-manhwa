"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/mui/BottomSheet";
import { useSession } from "@/lib/auth/client";
import { routes } from "@/lib/routes";
import { rpc } from "@/lib/rpc/client";

export type WordTarget = { word: string; sentence: string };

type SaveState = "idle" | "saving" | "saved" | string;

/** Meaning of a tapped English word + saving it to the SRS review queue. */
export function WordPopover({
  target,
  onClose,
}: {
  target: WordTarget | null;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [meaning, setMeaning] = useState<{ word: string; text: string | null }>();
  const [save, setSave] = useState<SaveState>("idle");
  const word = target?.word;

  useEffect(() => {
    if (!word) return;
    let active = true;
    setSave("idle");
    fetch(routes.api.wordMeaning(word))
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then(({ meaning: text }: { meaning: string }) => text)
      .catch(() => null)
      .then((text) => active && setMeaning({ word, text }));
    return () => {
      active = false;
    };
  }, [word]);

  const current = meaning?.word === word ? meaning : undefined;

  const onSave = async () => {
    if (!target) return;
    setSave("saving");
    try {
      await rpc.learn.saveWord({
        word: target.word,
        sentence: target.sentence,
        meaning: current?.text ?? undefined,
      });
      setSave("saved");
    } catch (error) {
      setSave((error as { message?: string }).message ?? "Não foi possível salvar.");
    }
  };

  return (
    <BottomSheet open={!!target} onClose={onClose} title={word}>
      <Stack spacing={1.5} sx={{ pb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
          {target?.sentence}
        </Typography>
        <Typography variant="h5">
          {current ? (current.text ?? "Tradução indisponível") : "Traduzindo…"}
        </Typography>

        {!session?.user ? (
          <Button href={routes.login} size="large" variant="outlined">
            Entre para salvar palavras
          </Button>
        ) : save === "saved" ? (
          <Button href={routes.learnReview} size="large" variant="outlined" color="success">
            Salva! Revisar agora
          </Button>
        ) : (
          <Button
            onClick={onSave}
            size="large"
            variant="contained"
            loading={save === "saving"}
            disabled={!current}
          >
            Salvar para revisar
          </Button>
        )}

        {save !== "idle" && save !== "saving" && save !== "saved" && (
          <Typography variant="caption" color="error">
            {save}
          </Typography>
        )}
      </Stack>
    </BottomSheet>
  );
}

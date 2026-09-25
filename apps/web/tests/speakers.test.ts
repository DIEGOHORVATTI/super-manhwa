import { expect, test } from "bun:test";

import { neuralUrl } from "@/lib/player/speakers";

const item = (pitch: number, rate: number) => ({
  paragraph: 0,
  text: "Olá — tudo bem?",
  voice: { id: "pt-BR-AntonioNeural", name: "Antonio", lang: "pt-BR" },
  style: "adulto" as const,
  pitch,
  rate,
});

test("URL neural leva voz, tom e ritmo do estilo em porcentagem e o texto codificado", () => {
  const url = new URL(neuralUrl(item(0.8, 0.85)), "http://x");
  expect(url.pathname).toBe("/api/tts");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    v: "pt-BR-AntonioNeural",
    p: "-8",
    r: "-15",
    t: "Olá — tudo bem?",
  });
});

test("tom extremo é limitado para não soar robótico", () => {
  const url = new URL(neuralUrl(item(2, 1)), "http://x");
  expect(url.searchParams.get("p")).toBe("40");
});

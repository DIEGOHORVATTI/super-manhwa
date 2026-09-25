import { test, expect } from "bun:test";

import { buildScript } from "@/lib/player/script";
import { buildQueue, characterVoice, splitIntoChunks } from "@/lib/player/voices";

const voice = (name: string, lang = "pt-BR") =>
  ({ name, lang, voiceURI: name, default: false, localService: true }) as SpeechSynthesisVoice;

const voices = [
  voice("Google português do Brasil"),
  voice("Microsoft Antonio"),
  voice("Microsoft Francisca"),
];
const context = { voices, overrides: {}, characterVoices: true };

test("o mesmo personagem sempre recebe a mesma voz e o mesmo tom", () => {
  const first = characterVoice("Orsted", "male", context);
  const second = characterVoice("Orsted", "male", context);
  expect(first).toEqual(second);
  expect(first.voice?.name).toBe("Microsoft Antonio");
  expect(first.pitch).toBeLessThan(1);
});

test("override do usuário vence a escolha automática", () => {
  const chosen = characterVoice("Orsted", "male", {
    ...context,
    overrides: { Orsted: { voiceURI: "Microsoft Francisca", pitch: 1.4 } },
  });
  expect(chosen).toEqual({ voice: voices[2], style: "adulto", pitch: 1.4, rate: 1 });
});

test("frases longas viram pedaços curtos sem perder texto", () => {
  const text = "Primeira frase. ".repeat(30).trim();
  const chunks = splitIntoChunks(text, 50);
  expect(chunks.every((chunk) => chunk.length <= 50)).toBe(true);
  expect(chunks.join(" ")).toBe(text);
});

test("fila mantém narração e fala do mesmo parágrafo com vozes diferentes", () => {
  const queue = buildQueue(buildScript(["— Não. — disse Orsted."]), context);
  expect(queue.map((item) => [item.paragraph, item.text, item.voice?.name])).toEqual([
    [0, "Não.", "Microsoft Antonio"],
    [0, "disse Orsted.", "Google português do Brasil"],
  ]);
});

test("tom automático fica sempre dentro da faixa do gênero", () => {
  const names = Array.from(
    { length: 200 },
    (_, index) => `Personagem ${index} ${"x".repeat(index % 7)}`,
  );
  const pitches = names.map((name) => characterVoice(name, "male", context).pitch);
  expect(Math.min(...pitches)).toBeGreaterThanOrEqual(0.68);
  expect(Math.max(...pitches)).toBeLessThanOrEqual(0.92);
});

test('estilo muda tom e velocidade, e é inferido de substantivos como "velho"', () => {
  const elder = characterVoice("Velho", "male", context);
  expect(elder.style).toBe("idoso");
  expect(elder.rate).toBeLessThan(1);
  expect(elder.pitch).toBeLessThan(
    characterVoice("Velho", "male", {
      ...context,
      overrides: { Velho: { style: "adulto" } },
    }).pitch,
  );

  const child = characterVoice("Aisha", "female", {
    ...context,
    overrides: { Aisha: { style: "crianca" } },
  });
  expect(child.pitch).toBeGreaterThan(1.5);
  expect(child.rate).toBeGreaterThan(1);
});

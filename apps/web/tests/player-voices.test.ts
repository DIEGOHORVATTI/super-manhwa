import { test, expect } from "bun:test";

import { buildScript } from "@/lib/player/script";
import {
  buildQueue,
  characterVoice,
  englishQueue,
  englishVoice,
  splitIntoChunks,
} from "@/lib/player/voices";

const voice = (name: string, lang = "pt-BR") => ({ id: name, name, lang });

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
  expect(queue.map((item) => [item.paragraph, item.text])).toEqual([
    [0, "Não."],
    [0, "disse Orsted."],
  ]);
  expect(queue[1].voice?.name).toBe("Google português do Brasil");
  expect(queue[0].voice?.name).not.toBe(queue[1].voice?.name);
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

test("vozes multilíngues entram no sorteio dos personagens e o narrador fica de fora", () => {
  const neural = [
    { id: "pt-BR-FranciscaNeural", name: "Francisca", lang: "pt-BR", gender: "female" as const },
    {
      id: "en-US-AvaMultilingualNeural",
      name: "Ava",
      lang: "en-US",
      gender: "female" as const,
      multilingual: true,
    },
    { id: "en-US-JennyNeural", name: "Jenny", lang: "en-US", gender: "female" as const },
  ];
  const chosen = characterVoice("Sylphie", "female", {
    voices: neural,
    overrides: {},
    characterVoices: true,
  });
  expect(chosen.voice?.id).toBe("en-US-AvaMultilingualNeural");
});

test("modo ouvir toca cada parágrafo em inglês e depois em português", () => {
  const english = voice("en-US-AvaMultilingualNeural", "en-US");
  const script = buildScript(["Ele sorriu.", "— Vamos — disse Rudeus."]);
  const portuguese = buildQueue(script, context);
  const queue = englishQueue(
    portuguese,
    ["He smiled.", "Let's go, said Rudeus."],
    english,
    "listen",
  );

  expect(queue.map((item) => [item.paragraph, item.text])).toEqual([
    [0, "He smiled."],
    [0, "Ele sorriu."],
    [1, "Let's go, said Rudeus."],
    ...portuguese.filter((item) => item.paragraph === 1).map((item) => [1, item.text]),
  ]);
  expect(queue[0].voice).toBe(english);
  expect(englishQueue(portuguese, ["He smiled."], english, "read")).toHaveLength(1);
  expect(englishVoice([...voices, english])).toBe(english);
});

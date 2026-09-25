import { test, expect } from "bun:test";

import { UNKNOWN, NARRATOR, PROTAGONIST, buildScript } from "@/lib/player/script";

const speakers = (lines: { speaker: string }[][]) =>
  lines.map((line) => line.map((s) => s.speaker));

test("tag de fala define o personagem e o trecho narrado vai para o narrador", () => {
  const { lines } = buildScript(["— Desculpe por ter feito você esperar — eu disse."]);
  expect(lines[0]).toEqual([
    { text: "Desculpe por ter feito você esperar", speaker: PROTAGONIST },
    { text: "eu disse.", speaker: NARRATOR },
  ]);
});

test("nome citado dentro da fala não troca quem está falando", () => {
  const { lines } = buildScript([
    "— Quem é o último? — perguntei.",
    "— Tristina Purplehorse — respondeu Orsted.",
    "— Ariel, então?",
    "— Sim, e Sylphie também.",
  ]);
  expect(speakers(lines)).toEqual([
    [PROTAGONIST, NARRATOR],
    ["Orsted", NARRATOR],
    [PROTAGONIST],
    ["Orsted"],
  ]);
});

test("pronome resolve para o interlocutor e aprende o gênero", () => {
  const { lines, genders } = buildScript([
    "— Oi — disse Sylphie.",
    "— Olá — respondi.",
    "— Tudo bem? — perguntou ela.",
  ]);
  expect(lines[2][0].speaker).toBe("Sylphie");
  expect(genders.get("Sylphie")).toBe("female");
});

test("fala com interjeição no meio mantém o mesmo falante nas duas partes", () => {
  const { lines } = buildScript(["— Espere — disse a garota, sorrindo. — Eu vou junto."]);
  expect(speakers(lines)).toEqual([["Garota", NARRATOR, "Garota"]]);
});

test("quebra de cena encerra a conversa e fala sem pista vira desconhecido", () => {
  const { lines } = buildScript(["— A — disse Orsted.", "— B — eu disse.", "***", "— C"]);
  expect(lines[3][0].speaker).toBe(UNKNOWN);
});

test("fala sem pista assume o interlocutor mais próximo, não o mais frequente", () => {
  const { lines } = buildScript([
    "— Oi — eu disse.",
    "— Oi.",
    "— Vamos — disse Orsted.",
    ...Array.from({ length: 5 }, () => "Narração."),
    "— Olá — disse Sylphie.",
    "— Olá — respondi.",
    "— Tudo bem? — perguntou Sylphie.",
  ]);
  expect(lines[1][0].speaker).toBe("Orsted");
});

test("nome terminado em i não é confundido com verbo em primeira pessoa", () => {
  const { lines } = buildScript(["— Oi — Nanahoshi disse.", "— Tchau. — Eu disse isso."]);
  expect(speakers(lines)).toEqual([
    ["Nanahoshi", NARRATOR],
    [PROTAGONIST, NARRATOR],
  ]);
});

test("falas sem tag no início da conversa são preenchidas quando os dois participantes aparecem", () => {
  const { lines } = buildScript([
    "— Desculpe a demora — eu disse.",
    "— Não. Cheguei agora.",
    "— Certo.",
    "— Vamos ao assunto — disse Orsted.",
  ]);
  expect(lines.map((line) => line[0].speaker)).toEqual([
    PROTAGONIST,
    "Orsted",
    PROTAGONIST,
    "Orsted",
  ]);
});

test("nome seguido de verbo qualquer no pretérito também é tag", () => {
  const { lines } = buildScript(["— Hm. — Orsted apenas grunhiu."]);
  expect(lines[0][0].speaker).toBe("Orsted");
});

test("narração que termina apresentando o personagem define quem fala a seguir", () => {
  const { lines } = buildScript([
    "Destemido, Orsted disse:",
    "— Não.",
    "Sylphie balançou a cabeça.",
    "— Nunca.",
  ]);
  expect(lines[1][0].speaker).toBe("Orsted");
  expect(lines[3][0].speaker).toBe("Sylphie");
});

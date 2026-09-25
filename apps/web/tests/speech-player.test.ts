import { beforeEach, expect, test } from "bun:test";

import { SpeechPlayer } from "@/lib/player/speech-player";

type FakeUtterance = {
  text: string;
  onend?: () => void;
  onpause?: () => void;
  onresume?: () => void;
  onerror?: (event: { error: string }) => void;
};

let resumed = 0;

let spoken: FakeUtterance[] = [];

beforeEach(() => {
  spoken = [];
  Object.assign(globalThis, {
    window: globalThis,
    SpeechSynthesisUtterance: class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
    speechSynthesis: {
      speak: (utterance: FakeUtterance) => spoken.push(utterance),
      cancel: () => {},
      resume: () => {
        resumed += 1;
      },
    },
  });
});

const queue = [
  { paragraph: 0, text: "Primeiro.", pitch: 1, rate: 1, style: "adulto" as const },
  { paragraph: 1, text: "Segundo.", pitch: 1, rate: 1, style: "adulto" as const },
];

test("interrupção externa repete o mesmo trecho em vez de travar", () => {
  const player = new SpeechPlayer();
  player.load(queue);
  player.play();

  spoken.at(-1)!.onerror!({ error: "interrupted" });
  expect(spoken.at(-1)!.text).toBe("Primeiro.");
  expect(player.getSnapshot().status).toBe("playing");

  spoken.at(-1)!.onend!();
  expect(spoken.at(-1)!.text).toBe("Segundo.");
});

test("interrupções seguidas param o player com mensagem de erro", () => {
  const player = new SpeechPlayer();
  player.load(queue);
  player.play();

  for (let attempt = 0; attempt < 3; attempt += 1)
    spoken.at(-1)!.onerror!({ error: "interrupted" });

  expect(player.getSnapshot().status).toBe("idle");
  expect(player.getSnapshot().error).toContain("falhou");
});

test("erro de trecho antigo (depois de pular) é ignorado", () => {
  const player = new SpeechPlayer();
  player.load(queue);
  player.play();
  const stale = spoken.at(-1)!;

  player.skip(1);
  stale.onerror!({ error: "interrupted" });

  expect(spoken.at(-1)!.text).toBe("Segundo.");
  expect(player.getSnapshot().paragraph).toBe(1);
});

test("pausa pela tecla de mídia atualiza o estado e o play volta a falar", () => {
  const player = new SpeechPlayer();
  player.load(queue);
  player.play();

  spoken.at(-1)!.onpause!();
  expect(player.getSnapshot().status).toBe("paused");

  const before = resumed;
  player.play();
  expect(resumed).toBeGreaterThan(before);
  expect(spoken.at(-1)!.text).toBe("Primeiro.");

  spoken.at(-1)!.onpause!();
  spoken.at(-1)!.onresume!();
  expect(player.getSnapshot().status).toBe("playing");
});

import { expect, test } from "bun:test";

import { batchParagraphs } from "@/lib/translate";

test("agrupa parágrafos sem passar do limite e sem perder a ordem", () => {
  const paragraphs = ["a".repeat(40), "b".repeat(40), "c".repeat(40), "d".repeat(100)];
  const batches = batchParagraphs(paragraphs, 90);
  expect(batches).toEqual([[paragraphs[0], paragraphs[1]], [paragraphs[2]], [paragraphs[3]]]);
  for (const batch of batches.slice(0, 2))
    expect(batch.join("\n\n").length).toBeLessThanOrEqual(90);
});

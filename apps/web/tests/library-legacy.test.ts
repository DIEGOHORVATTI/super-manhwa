import { expect, test } from "bun:test";

import { isNovelSlug } from "@/lib/library";

test("só slugs do Central Novel contam como obra; ids do catálogo antigo são descartados", () => {
  expect(isNovelSlug("mushoku-tensei-jobless-reincarnation")).toBe(true);
  expect(isNovelSlug("shadow-slave-20260913")).toBe(true);
  expect(isNovelSlug("105398")).toBe(false);
  expect(isNovelSlug("c7M3afYpPo5S0Y8xi78eHDLw4oOy0SpqJZevc93p0ZFaTRTNIjff9oTZ")).toBe(false);
  expect(isNovelSlug("abc_def")).toBe(false);
});

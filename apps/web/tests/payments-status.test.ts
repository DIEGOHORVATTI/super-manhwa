import { describe, expect, it } from "bun:test";

import { normalizeMpStatus } from "../lib/payments/status";

describe("normalizeMpStatus", () => {
  it("maps approved", () => {
    expect(normalizeMpStatus("approved")).toBe("approved");
  });

  it("maps rejected and cancelled to rejected", () => {
    expect(normalizeMpStatus("rejected")).toBe("rejected");
    expect(normalizeMpStatus("cancelled")).toBe("rejected");
  });

  it("maps every other status (incl. unknown/null) to pending", () => {
    expect(normalizeMpStatus("pending")).toBe("pending");
    expect(normalizeMpStatus("in_process")).toBe("pending");
    expect(normalizeMpStatus("authorized")).toBe("pending");
    expect(normalizeMpStatus(null)).toBe("pending");
    expect(normalizeMpStatus(undefined)).toBe("pending");
    expect(normalizeMpStatus("weird")).toBe("pending");
  });
});

import { describe, expect, it } from "bun:test";

import { apiClient } from "../helpers/api-client";

describe("system / health", () => {
  it("/api/health is public (no X-API-KEY required) and returns versioned payload", async () => {
    const res = await apiClient.rawGet("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe("string");
    expect((body.version as string).length).toBeGreaterThan(0);
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(typeof body.timestamp).toBe("string");
  });
});

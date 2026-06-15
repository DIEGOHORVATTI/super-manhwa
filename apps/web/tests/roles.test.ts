import { describe, expect, it } from "bun:test";

import { hasRole } from "../lib/roles";

describe("hasRole", () => {
  it("admin implies every capability", () => {
    expect(hasRole({ role: "admin" }, "admin")).toBe(true);
    expect(hasRole({ role: "admin" }, "staff")).toBe(true);
  });

  it("staff is staff but not admin", () => {
    expect(hasRole({ role: "staff" }, "staff")).toBe(true);
    expect(hasRole({ role: "staff" }, "admin")).toBe(false);
  });

  it("plain user has neither", () => {
    expect(hasRole({ role: "user" }, "staff")).toBe(false);
    expect(hasRole({ role: "user" }, "admin")).toBe(false);
  });

  it("null / missing role is denied", () => {
    expect(hasRole(null, "staff")).toBe(false);
    expect(hasRole(undefined, "admin")).toBe(false);
    expect(hasRole({}, "staff")).toBe(false);
    expect(hasRole({ role: null }, "staff")).toBe(false);
  });
});

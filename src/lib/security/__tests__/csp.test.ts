import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, createCspNonce } from "@/lib/security/csp";

describe("csp", () => {
  it("creates non-empty nonce", () => {
    const a = createCspNonce();
    const b = createCspNonce();
    expect(a.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });

  it("includes nonce and strict-dynamic", () => {
    const nonce = "testNonce+/=";
    const csp = buildContentSecurityPolicy(nonce);
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

import { describe, expect, it } from "vitest";
import { assertApiCsrf, isCsrfExemptPath } from "@/lib/security/csrf-origin";

describe("csrf-origin", () => {
  it("allows GET", () => {
    expect(
      assertApiCsrf({
        method: "GET",
        pathname: "/api/contact",
        origin: "https://evil.com",
        referer: null,
        secFetchSite: "cross-site",
      }).ok,
    ).toBe(true);
  });

  it("rejects cross-site POST to api", () => {
    const r = assertApiCsrf({
      method: "POST",
      pathname: "/api/contact",
      origin: "https://evil.example",
      referer: null,
      secFetchSite: "cross-site",
    });
    expect(r.ok).toBe(false);
  });

  it("allows trusted origin POST", () => {
    const r = assertApiCsrf({
      method: "POST",
      pathname: "/api/contact",
      origin: "https://shadjil.ir",
      referer: null,
      secFetchSite: "same-origin",
    });
    expect(r.ok).toBe(true);
  });

  it("exempts webhooks and cron", () => {
    expect(isCsrfExemptPath("/api/cron/backup")).toBe(true);
    expect(isCsrfExemptPath("/api/payment/webhook")).toBe(true);
  });
});

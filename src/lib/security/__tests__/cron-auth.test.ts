import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { assertCronBearer } from "@/lib/security/cron-auth";

describe("assertCronBearer", () => {
  const prev = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  });

  it("accepts Bearer token", () => {
    const req = new NextRequest("https://example.com/api/cron/jobs", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(assertCronBearer(req)).toBe(true);
  });

  it("rejects query secret", () => {
    const req = new NextRequest(
      "https://example.com/api/cron/jobs?secret=test-cron-secret",
    );
    expect(assertCronBearer(req)).toBe(false);
  });

  it("rejects missing auth", () => {
    const req = new NextRequest("https://example.com/api/cron/jobs");
    expect(assertCronBearer(req)).toBe(false);
  });

  it("rejects when CRON_SECRET unset", () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest("https://example.com/api/cron/jobs", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(assertCronBearer(req)).toBe(false);
  });
});

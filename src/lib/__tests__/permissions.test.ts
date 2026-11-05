import { describe, expect, it } from "vitest";
import { can, normalizeRole, permissionsFor } from "@/lib/permissions";

describe("permissions matrix", () => {
  it("normalizes roles", () => {
    expect(normalizeRole("Admin")).toBe("admin");
    expect(normalizeRole("staff")).toBe("staff");
    expect(normalizeRole("nope")).toBe("guest");
  });

  it("staff can enter admin but not settings/users", () => {
    expect(can("staff", "admin.access")).toBe(true);
    expect(can("staff", "admin.products")).toBe(true);
    expect(can("staff", "admin.orders")).toBe(true);
    expect(can("staff", "admin.settings")).toBe(false);
    expect(can("staff", "admin.users")).toBe(false);
    expect(can("staff", "admin.discounts")).toBe(false);
  });

  it("admin has all admin.*", () => {
    expect(can("admin", "admin.settings")).toBe(true);
    expect(can("admin", "admin.backup" as never)).toBe(false); // not in matrix
    expect(permissionsFor("admin").some((p) => p.startsWith("admin."))).toBe(
      true,
    );
  });
});

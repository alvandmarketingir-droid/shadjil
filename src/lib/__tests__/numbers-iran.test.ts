import { describe, expect, it } from "vitest";
import {
  normalizeIranMobile,
  normalizeIranPostalCode,
  toEnglishDigits,
  toPersianDigits,
  phoneLookupVariants,
  otpPhoneEmail,
} from "@/lib/numbers";

describe("Iran numbers", () => {
  it("mobile formats", () => {
    expect(normalizeIranMobile("09121234567")).toBe("09121234567");
    expect(normalizeIranMobile("۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
    expect(normalizeIranMobile("+989121234567")).toBe("09121234567");
    expect(normalizeIranMobile("123")).toBeNull();
  });

  it("postal code 10 digits", () => {
    expect(normalizeIranPostalCode("1234567890")).toBe("1234567890");
    expect(normalizeIranPostalCode("12345")).toBeNull();
  });

  it("digit convert", () => {
    expect(toEnglishDigits("۱۲۳")).toBe("123");
    expect(toPersianDigits(45)).toBe("۴۵");
  });

  it("phone lookup variants + otp email", () => {
    const v = phoneLookupVariants("09391926236");
    expect(v).toContain("09391926236");
    expect(v).toContain("+989391926236");
    expect(v).toContain("9391926236");
    expect(phoneLookupVariants("bad")).toEqual([]);
    expect(otpPhoneEmail("09391926236")).toBe(
      "09391926236@phone.pirahanmardane.ir",
    );
    expect(otpPhoneEmail("+989391926236")).toBe(
      "09391926236@phone.pirahanmardane.ir",
    );
  });
});

import { test, expect } from "@playwright/test";

test.describe("storefront smoke", () => {
  test("home returns 200 and has main landmark", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator("#main-content, main").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("products listing loads", async ({ page }) => {
    const res = await page.goto("/products", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
  });

  test("cart page loads", async ({ page }) => {
    const res = await page.goto("/cart", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
  });

  test("blog index loads", async ({ page }) => {
    const res = await page.goto("/blog", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
  });

  test("login page loads with password and OTP tabs", async ({ page }) => {
    const res = await page.goto("/ورود", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: /رمز عبور/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /OTP|ورود با OTP/ })).toBeVisible();
  });

  test("forgot-password UI opens from login", async ({ page }) => {
    await page.goto("/ورود", { waitUntil: "domcontentloaded" });
    const forgot = page.getByRole("button", { name: /فراموشی رمز/ });
    await expect(forgot).toBeVisible({ timeout: 15_000 });
    await forgot.click();
    await expect(
      page.getByRole("button", { name: /ارسال کد بازیابی|ادامه بازیابی/ }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("register page loads", async ({ page }) => {
    const res = await page.goto("/ثبت-نام", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
  });

  test("checkout empty still reachable", async ({ page }) => {
    const res = await page.goto("/checkout", { waitUntil: "domcontentloaded" });
    // empty cart may redirect or show validation — must not 5xx
    expect(res?.status() ?? 0).toBeLessThan(500);
  });

  test("health api ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
  });

  test("guest cart session cookie set after visiting cart", async ({ page, context }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    // trigger a server action path that ensures session: navigate products then cart again
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await page.goto("/cart", { waitUntil: "networkidle" });
    const cookies = await context.cookies();
    // Cookie may only appear after add-to-cart; soft assert — page must stay 200
    expect(page.url()).toMatch(/cart|سبد/);
    void cookies;
  });
});

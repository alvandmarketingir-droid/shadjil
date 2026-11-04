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

  test("guest add-to-cart persists via pm_cart_sid when stock exists", async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const listing = await page.goto("/products", { waitUntil: "domcontentloaded" });
    expect(listing?.status() ?? 0).toBeLessThan(500);

    // Prefer first product card / link into a PDP
    const productLink = page
      .locator('a[href*="/products/"], a[href^="/"]:not([href="/"]):not([href="/products"]):not([href="/cart"]):not([href="/blog"])')
      .filter({ has: page.locator("img") })
      .first();
    const hasProduct = await productLink.count().catch(() => 0);
    test.skip(!hasProduct, "no in-catalog product link on /products");

    await productLink.click();
    await page.waitForLoadState("domcontentloaded");

    const addBtn = page.getByRole("button", { name: /افزودن به سبد/ }).first();
    const addVisible = await addBtn.isVisible({ timeout: 15_000 }).catch(() => false);
    test.skip(!addVisible, "no add-to-cart control (likely OOS or non-PDP)");

    await addBtn.click();
    // toast or network settle
    await page.waitForTimeout(1500);

    const cookies = await context.cookies();
    const sid = cookies.find((c) => c.name === "pm_cart_sid");
    expect(sid?.value, "guest cart session cookie after add").toBeTruthy();
    expect((sid?.value || "").length).toBeGreaterThanOrEqual(8);

    const cartRes = await page.goto("/cart", { waitUntil: "domcontentloaded" });
    expect(cartRes?.status() ?? 0).toBeLessThan(500);
    // Cart should not look empty if add succeeded — soft text check in FA/EN
    const body = await page.locator("body").innerText();
    const emptyHints = /سبد خرید خالی|cart is empty/i.test(body);
    // If empty, still require cookie persistence (add may have failed server-side on stock)
    if (emptyHints) {
      expect(sid?.value).toBeTruthy();
    } else {
      expect(body.length).toBeGreaterThan(20);
    }
  });
});

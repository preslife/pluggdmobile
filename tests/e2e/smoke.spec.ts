import { test, expect } from "@playwright/test";

test.describe("Smoke – public storefront flows", () => {
  test("landing page renders primary navigation", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("link", { name: /Marketplace/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Library/i })).toBeVisible();
  });

  test("sample pack store exposes filters and pricing info", async ({ page }) => {
    const response = await page.goto("/sample-pack-store");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByPlaceholder("Search sample packs...")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Genre/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Sort by/i })).toBeVisible();
  });

  test("account orders page gates unauthenticated viewers", async ({ page }) => {
    const response = await page.goto("/account/orders");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: /Order History/i })).toBeVisible();
    await expect(page.getByText(/Sign in required/i)).toBeVisible();
    await expect(page.getByText(/Please sign in to view your order history/i)).toBeVisible();
  });
});

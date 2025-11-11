import { test, expect } from "@playwright/test";

const STORAGE_KEY = "sb-qkwvqmubhyondemhasjp-auth-token";
const BASE_SESSION = {
  currentSession: {
    access_token: "test-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "test-refresh-token",
    user: {
      id: "00000000-0000-0000-0000-000000000000",
      email: "playwright@example.com",
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  currentUser: {
    id: "00000000-0000-0000-0000-000000000000",
    email: "playwright@example.com",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

test.describe("Notification preferences", () => {
  test("allows toggling a preference with Supabase RPC mocked", async ({ page }) => {
    await page.addInitScript(([storageKey, session]) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    }, [STORAGE_KEY, BASE_SESSION]);

    await page.route("**/rest/v1/rpc/get_notification_prefs", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ notify_purchases: true }),
      });
    });

    await page.route("**/rest/v1/rpc/set_notification_pref", async (route) => {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ notify_purchases: body.p_value }),
      });
    });

    await page.goto("/settings/notifications");

    await expect(page.getByText("Notification preferences")).toBeVisible();

    const purchasesToggle = page.getByRole("switch", { name: "Product purchases" });
    await expect(purchasesToggle).toHaveAttribute("aria-checked", "true");

    await purchasesToggle.click();
    await expect(purchasesToggle).toHaveAttribute("aria-checked", "false");
  });
});

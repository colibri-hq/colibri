import { expect, test } from "@playwright/test";
import jwt from "jsonwebtoken";
import { TEST_NON_ADMIN_USER_ID } from "../test-data";

/**
 * Tests for authentication guards and protected routes.
 *
 * These tests verify:
 * 1. Unauthenticated users are redirected to login
 * 2. Post-login redirect returns users to their original destination
 * 3. Non-admin users receive 403 on admin-only routes
 * 4. Admin users can access admin routes
 */

test.describe("Authentication Guards", () => {
  test.describe("Unauthenticated Access", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("redirects to login when accessing protected route", async ({ page }) => {
      // Try to access a protected route without authentication
      await page.goto("/works");

      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("stores original URL for post-login redirect", async ({ page }) => {
      // Try to access a specific protected route
      await page.goto("/collections");

      // Should be redirected to login with previous location stored
      await expect(page).toHaveURL(/\/auth\/login/);

      // Check that the _previous cookie or query param is set
      const cookies = await page.context().cookies();
      const previousCookie = cookies.find((c) => c.name === "_previous");

      // Either the cookie or query param should contain the original path
      const url = new URL(page.url());
      const previousParam = url.searchParams.get("previous");

      const hasPreviousLocation =
        previousCookie?.value.includes("/collections") || previousParam?.includes("/collections");

      expect(hasPreviousLocation).toBe(true);
    });

    test("allows access to public auth routes", async ({ page }) => {
      // Auth routes should be accessible without authentication
      const response = await page.goto("/auth/login");

      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL("/auth/login");
    });
  });

  test.describe("Admin Routes", () => {
    test("admin user can access moderation page", async ({ page }) => {
      // The default test user (ID 999) is an admin
      const response = await page.goto("/instance/moderation");

      // Should load successfully (not redirected, not 403)
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL("/instance/moderation");
    });

    test("non-admin user receives 403 on moderation page", async ({ page, context }) => {
      // Clear existing auth and set up a non-admin user
      await context.clearCookies();

      const sessionCookieName = process.env.JWT_COOKIE_NAME || "jwt";
      await context.addCookies([
        {
          name: sessionCookieName,
          value: jwt.sign(
            { name: "Regular User", email: "user@colibri-hq.org" },
            process.env.JWT_SECRET!,
            { subject: TEST_NON_ADMIN_USER_ID },
          ),
          domain: "localhost",
          path: "/",
          expires: Math.floor(Date.now() / 1_000 + 100_000),
          httpOnly: false,
        },
      ]);

      // Try to access admin-only route
      const response = await page.goto("/instance/moderation");

      // Should receive 403 Forbidden
      expect(response?.status()).toBe(403);
    });
  });

  test.describe("Authenticated Access", () => {
    test("authenticated user can access protected routes", async ({ page }) => {
      // The test user should be able to access protected routes
      const response = await page.goto("/works");

      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL("/works");
    });

    test("authenticated user can access instance settings", async ({ page }) => {
      const response = await page.goto("/instance/settings");

      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL("/instance/settings");
    });
  });
});

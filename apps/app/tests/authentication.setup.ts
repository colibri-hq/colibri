import { expect } from "@playwright/test";
import jwt from "jsonwebtoken";
import { storageState } from "../playwright.config";
import { test as setup } from "./base";

setup("Authenticate the session", async ({ page }) => {
  const sessionCookieName = process.env.JWT_COOKIE_NAME || "jwt";

  await page.context().addCookies([
    {
      name: sessionCookieName,
      value: jwt.sign(
        { name: "Test User", email: "test@colibri-hq.org" },
        process.env.JWT_SECRET!,
        {
          subject: "999",
        },
      ),
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1_000 + 100_000),
      httpOnly: false,
    },
  ]);

  // Debugging step to check cookies
  const cookies = await page.context().cookies();

  expect(cookies).toHaveLength(1);
  expect(cookies[0]).toHaveProperty("name", sessionCookieName);

  await page.context().storageState({ path: storageState });
});

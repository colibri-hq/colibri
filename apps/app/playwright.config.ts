import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config';

export const storageState = join(import.meta.dirname, 'tests', '.storageState.json');

// noinspection JSUnusedGlobalSymbols
/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  name: 'Colibri',
  testDir: './tests',

  //  Run tests in files in parallel
  fullyParallel: true,

  //  Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  //  Retry on CI only
  retries: process.env.CI ? 2 : 0,

  //  Opt out of parallel tests on CI.
  workers: 1, // process.env.CI ? 1 : '50%',

  timeout: 5_000,

  //  Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: [
    ['html', {outputFolder: 'test-results'}]
  ],

  // Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions.
  use: {
    //  Base URL to use in actions like `await page.goto('/')`.
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',
  },

  //  Configure projects for major browsers
  projects: [
    {
      name: 'setup database',
      testMatch: 'database.setup.ts',
      teardown: 'teardown database',
    },
    {
      name: 'teardown database',
      testMatch: 'database.teardown.ts',
    },
    {
      name: 'setup authentication',
      testMatch: 'authentication.setup.ts',
      dependencies: ['setup database'],
    },
    {
      name: 'authentication',
      testMatch: ['auth/*.spec.ts', 'auth/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState,
      },
      dependencies: ['setup database', 'setup authentication'],
    },

    {
      name: 'chromium',
      testMatch: ['app/*.spec.ts', 'app/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState },
      dependencies: ['setup database', 'setup authentication'],
    },

    {
      name: 'firefox',
      testMatch: 'app/**/*.spec.ts',
      use: { ...devices['Desktop Firefox'], storageState },
      dependencies: ['setup database', 'setup authentication'],
    },

    {
      name: 'webkit',
      testMatch: 'app/**/*.spec.ts',
      use: { ...devices['Desktop Safari'], storageState },
      dependencies: ['setup database', 'setup authentication'],
    },

    //  Test against mobile viewports.
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    //  Test against branded browsers.
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  //  Run your local dev server before starting the tests
  webServer: {
    env: {
      ORIGIN: 'http://localhost:5173',
    },
    ignoreHTTPSErrors: false,
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});

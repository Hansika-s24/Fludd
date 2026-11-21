import { defineConfig, devices } from "@playwright/test";

// End-to-end checks against a running app: `npm run dev -- -p 3123`, or E2E_BASE_URL=https://fludd.app.
// ponytail: uses the system Edge so no browser download is needed; `npx playwright install chromium` and drop
// `channel` if a machine has no Edge (CI).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  reporter: "list",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3123", channel: "msedge", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["iPhone 15"], defaultBrowserType: "chromium", channel: "msedge" } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});

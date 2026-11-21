import { expect, test, type Page } from "@playwright/test";

/** A finished profile for a home inside the model area, so most tests skip onboarding. */
const PROFILE = {
  home: { label: "4202 E Fowler Ave, Tampa, 33620", position: [-82.4139475455857, 28.061936669896859] },
  car: { label: "At home", position: [-82.4139475455857, 28.061936669896859] },
  drives: "daily",
  housing: { tenure: "rent", type: "apartment", floor: 1 },
  insurance: { flood: "none", contents: "yes", carrier: "", policyNumber: "", renewal: "" },
  camera: { optIn: false, snapshotUrl: "" },
  done: true,
};

async function openAsResident(page: Page) {
  await page.addInitScript((p) => localStorage.setItem("fludd-profile-v1", JSON.stringify(p)), PROFILE);
  await page.goto("/");
  await expect(page.getByText("Flood grade")).toBeAttached();
  // Phone: the sheet rests at peek; raise it like a resident would.
  if ((page.viewportSize()?.width ?? 1440) < 768) await page.getByRole("button", { name: "Resize panel" }).click();
}

const sheet = (page: Page) => page.locator("#tab-panel");

test("first run: onboarding leads to a graded home", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("radio", { name: "I rent" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Apartment" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Ground floor" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("dialog").locator("input[type=search]").pressSequentially("4202 E Fowler Ave");
  await page.getByRole("option", { name: "4202 E Fowler Ave, Tampa" }).click();
  await page.getByRole("button", { name: "I park at home" }).click();
  await page.getByRole("radio", { name: /Every day/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Yes", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog").getByText("4202 E Fowler Ave, Tampa, 33620")).toBeVisible();
  await page.getByRole("button", { name: "Show me my home" }).click();
  await expect(sheet(page).getByText("Flood grade")).toBeAttached();
  await expect(page.getByRole("tab", { name: /Plan a move/ })).toHaveAttribute("aria-selected", "true");
});

test("onboarding refuses a home outside the model area", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("radio", { name: "I own my home" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "House", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Davis Islands, downtown Tampa: well outside the USF box.
  await page.getByRole("dialog").locator("input[type=search]").pressSequentially("1 Davis Blvd");
  await page.getByRole("option").first().click();
  await expect(page.getByText(/outside the area/)).toBeVisible();
});

test("one address before, during and after a flood", async ({ page }) => {
  await openAsResident(page);
  await page.getByRole("tab", { name: /Storm mode/ }).click();
  await expect(sheet(page).getByText("Move your car by")).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Storm" })).toBeVisible();
  await page.getByRole("tab", { name: /After a flood/ }).click();
  await expect(sheet(page).getByText("What Hurricane Milton did here")).toBeVisible();
  await page.getByRole("button", { name: "Replay Milton on the map" }).click();
  await expect(page.getByRole("tab", { name: /Storm mode/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("radio", { name: "Milton" })).toHaveAttribute("aria-checked", "true");
});

test("shortcuts open each section and close back to home", async ({ page }) => {
  await openAsResident(page);
  await page.getByRole("button", { name: "Live" }).click();
  await expect(page.getByRole("tab", { name: /Storm mode/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Food & help" }).click();
  await expect(page.getByRole("heading", { name: "Food & help" })).toBeVisible();
  await expect(sheet(page).getByText("211", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  // Rewards has no button of its own: the weekly highlight opens it.
  await page.getByRole("button", { name: /See impact/ }).click();
  await expect(page.getByRole("heading", { name: "Your impact" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "You", exact: true }).click();
  await expect(sheet(page).getByText("4202 E Fowler Ave")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("tab", { name: /Plan a move/ })).toBeVisible();
});

test("every section keeps the floodwater warning", async ({ page }) => {
  await openAsResident(page);
  const warning = page.getByText("Never drive or walk into floodwater.").first();
  await expect(warning).toBeAttached();
  for (const s of ["Ask Pelican", "Food & help"]) {
    await page.getByRole("button", { name: s }).click();
    await expect(warning).toBeAttached();
    await page.getByRole("button", { name: "Close" }).click();
  }
});

test("Ask Pelican finds groceries on open roads", async ({ page }) => {
  test.slow(); // live place search (Overpass, ArcGIS fallback)
  await openAsResident(page);
  await page.getByRole("button", { name: "Ask Pelican" }).click();
  const input = sheet(page).getByLabel("Ask Pelican where you need to go");
  await input.fill("I want to get groceries");
  await input.press("Enter");
  await expect(sheet(page).getByText(/about \d+ min by car/)).toBeVisible({ timeout: 30_000 });
  await expect(sheet(page).getByText("Never drive into floodwater.", { exact: false })).toBeVisible();
});

test("no tab bar: the map and one sheet", async ({ page }) => {
  await openAsResident(page);
  await expect(page.getByRole("tablist", { name: "Sections" })).toHaveCount(0);
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(page.getByRole("main").getByText("Fludd", { exact: true })).toBeVisible();
});

test("the reports route validates uploads", async ({ request }) => {
  const res = await request.post("/api/reports", { multipart: { lat: "28.06", lng: "-82.41", source: "gps" } });
  expect(res.status()).toBe(400);
  expect((await res.json()).error.code).toBe("bad_request");
});

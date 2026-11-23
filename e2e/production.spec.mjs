import { expect, test } from "./fixtures.mjs";

// Files and signals a public deployment needs: search engines, share previews, "add to home
// screen", and the self-hosted analytics / error monitoring endpoint.
test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("robots.txt keeps the private app out of search engines and points to the sitemap", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Allow: /sign-in");
    expect(robots).toContain("Disallow: /");
    expect(robots).toMatch(/Sitemap: http.*\/sitemap\.xml/);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("/sign-up</loc>");
  });

  test("share previews and the web app manifest are available", async ({ page, request }) => {
    await page.goto("/sign-in");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/opengraph-image/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /household budget/);
    const image = await request.get(new URL(await page.locator('meta[property="og:image"]').getAttribute("content")).pathname);
    expect(image.headers()["content-type"]).toBe("image/png");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ name: "Household Hub", display: "standalone" });
  });
});

test.describe("password guessing", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sign-in is blocked for a while after repeated wrong passwords", async ({ page }) => {
    await page.goto("/sign-in");
    // An address nobody uses, so the other tests' accounts aren't affected.
    const email = `guess-${Date.now()}@e2e.test`;
    for (let attempt = 1; attempt <= 8; attempt++) {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(`wrong-${attempt}`);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.locator("form").getByRole("alert")).toHaveText("Incorrect email or password.");
      // React resets the form after each submit; wait for that before typing again.
      await expect(page.getByLabel("Password")).toHaveValue("");
    }
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-9");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(/^Too many attempts. Please wait 15 minutes/);
  });
});

test("signed-in pages ask search engines not to index them", async ({ page }) => {
  await page.goto("/budget");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("page views and browser errors are reported to our own server, without query strings", async ({ page }) => {
  // Browsers don't expose a beacon's body to the test, so record what the page hands to sendBeacon
  // (the real one still sends it).
  await page.addInitScript(() => {
    window.__beacons = [];
    const send = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      data.text().then(text => window.__beacons.push({ url: String(url), ...JSON.parse(text) }));
      return send(url, data);
    };
  });
  const reported = () => page.evaluate(() => window.__beacons);

  await page.goto("/transactions?q=secret");
  await expect
    .poll(async () => (await reported()).find(event => event.type === "page_view"))
    .toMatchObject({
      url: "/api/telemetry",
      path: "/transactions",
    });

  // An error event as the browser would raise it (without failing this test on a real exception).
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent("error", { message: "Synthetic test error" })));
  await expect.poll(async () => (await reported()).find(event => event.type === "client_error")?.message).toBe("Synthetic test error");
  expect(JSON.stringify(await reported())).not.toContain("secret");
});

test("the telemetry endpoint rejects anything that isn't one of our events", async ({ request }) => {
  expect((await request.post("/api/telemetry", { data: { type: "page_view", path: "/" } })).status()).toBe(204);
  expect((await request.post("/api/telemetry", { data: { type: "steal", payload: 1 } })).status()).toBe(400);
  expect((await request.post("/api/telemetry", { data: "x".repeat(5000) })).status()).toBe(413);
});

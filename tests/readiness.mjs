import { expect } from "@playwright/test";

export async function checkCheckoutReadiness(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const script = origin + "/fixture/checkout.js";
  const { promise: holdScript, resolve: releaseScript } = Promise.withResolvers();
  try {
    await context.route("**/*", async route => {
      const request = route.request();
      if (new URL(request.url()).origin !== origin || request.method() !== "GET") return route.abort();
      if (request.url() === script) await holdScript;
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5_000);
    await Promise.all([
      page.waitForRequest(script),
      page.goto(origin + "/fixture/corrected/", { waitUntil: "commit" }),
    ]);

    const collection = page.getByRole("radio", { name: /Collect from workshop/ });
    const confirm = page.getByRole("button", { name: "Confirm sample order" });
    await expect(collection).toBeDisabled();
    await expect(confirm).toBeDisabled();
    await page.getByText("Collect from workshop").tap({ force: true });
    await expect(collection).not.toBeChecked();

    releaseScript();
    await collection.check();
    await expect(page.getByTestId("total")).toHaveText("£12.00");
  } finally {
    releaseScript();
    await context.close();
  }
}

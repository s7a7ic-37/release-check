import { createServer } from "node:http";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { verdict } from "./report.mjs";
import { checkCheckoutReadiness } from "../tests/readiness.mjs";

const port = 4191;
const origin = "http://127.0.0.1:" + port;
const dist = new URL("../dist/", import.meta.url);
const fixtures = ["baseline", "candidate", "corrected"];
const paths = new Map([
  ...fixtures.map(fixture => ["/fixture/" + fixture + "/", ["checkout.html", "text/html; charset=utf-8"]]),
  ["/fixture/checkout.js", ["checkout.js", "text/javascript; charset=utf-8"]],
  ["/fixture/checkout.css", ["checkout.css", "text/css; charset=utf-8"]],
]);
const files = new Map([...paths].map(([path, [name, type]]) =>
  [path, { body: readFileSync(new URL("../fixtures/" + name, import.meta.url)), type }]
));

async function runFixture(browser, fixture) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "en-GB",
  });
  const checks = [];
  const screenshot = "evidence/" + fixture + ".png";
  const trace = "evidence/" + fixture + ".zip";
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    const page = await context.newPage();
    await page.goto(origin + "/fixture/" + fixture + "/", { waitUntil: "load", timeout: 10_000 });
    const total = page.getByTestId("total");
    const steps = [
      { name: "Show the total with standard delivery", expected: "£15.00", output: total },
      {
        name: "Remove the delivery fee when collection is selected",
        expected: "£12.00",
        output: total,
        action: () => page.getByRole("radio", { name: /Collect from workshop/ }).check({ timeout: 1500 }),
      },
      {
        name: "Confirm the sample order",
        expected: "Sample order confirmed.",
        output: page.getByRole("status"),
        action: () => page.getByRole("button", { name: "Confirm sample order" }).click({ timeout: 1500 }),
      },
    ];
    let status = "passed";
    for (const { name, expected, output, action } of steps) {
      if (status === "failed") {
        checks.push({ name, status: "skipped" });
        continue;
      }
      try {
        await action?.();
        await expect(output).toHaveText(expected, { timeout: 1000 });
        checks.push({ name, status: "passed", expected });
      } catch {
        const observed = await output.textContent({ timeout: 1000 }).catch(() => "");
        checks.push({ name, status: "failed", expected, observed: observed?.trim() || "No value shown" });
        status = "failed";
      }
    }
    await page.screenshot({ path: fileURLToPath(new URL(screenshot, dist)), fullPage: true });
    return { id: fixture === "baseline" ? "baseline" : "candidate", fixture, status, checks, screenshot, trace };
  } finally {
    try {
      await context.tracing.stop({ path: fileURLToPath(new URL(trace, dist)) });
    } finally {
      await context.close();
    }
  }
}

function writeReport(results, metadata, stem) {
  const report = { status: verdict(results), ...metadata, results };
  const json = JSON.stringify(report, null, 2);
  writeFileSync(new URL(stem + ".json", dist), json + "\n");
  writeFileSync(new URL(stem + "-data.js", dist), "export default " + json + ";\n");
  return report;
}

async function main() {
  const checkReadiness = process.argv.includes("--check-readiness");
  if (!checkReadiness) {
    mkdirSync(new URL("evidence/", dist), { recursive: true });
    cpSync(new URL("../public/", import.meta.url), dist, { recursive: true });
    for (const [route, asset] of files) {
      const file = new URL(route.slice(1) + (route.endsWith("/") ? "index.html" : ""), dist);
      mkdirSync(new URL(".", file), { recursive: true });
      writeFileSync(file, asset.body);
    }
  }
  const server = createServer((request, response) => {
    const asset = files.get(request.url);
    if (request.method !== "GET" || !asset) return response.writeHead(404).end();
    response.writeHead(200, { "Content-Type": asset.type, "Cache-Control": "no-store" }).end(asset.body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  let browser;
  try {
    browser = await chromium.launch();
    if (checkReadiness) {
      await checkCheckoutReadiness(browser, origin);
      console.log("Checkout waits for its script before accepting collection.");
      return;
    }
    const results = [];
    for (const fixture of fixtures) results.push(await runFixture(browser, fixture));
    const [baseline, candidate, corrected] = results;
    const metadata = {
      createdAt: new Date().toISOString(), viewport: 390,
      browser: "Chromium " + browser.version(),
    };
    const brokenReport = writeReport([baseline, candidate], metadata, "report");
    const correctedReport = writeReport([baseline, corrected], metadata, "corrected-report");
    const useCorrected = process.argv.includes("--corrected");
    const report = useCorrected ? correctedReport : brokenReport;
    console.log((useCorrected ? "Corrected checkout" : "Broken checkout") + ": release " + report.status + ". Reports saved to dist.");
    for (const result of results) {
      const failed = result.checks.find(check => check.status === "failed");
      console.log(result.fixture + ": " + result.status + (failed ? " · " + failed.name +
        " · expected " + failed.expected + ", saw " + failed.observed : ""));
    }
    if (process.argv.includes("--gate") && report.status === "blocked") process.exitCode = 1;
  } finally {
    try {
      await browser?.close();
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 2;
});

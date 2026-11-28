import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const reports = [];
for (const file of ["report.json", "corrected-report.json"]) {
  const report = JSON.parse(await readFile(new URL(file, dist), "utf8"));
  if (process.env.GITHUB_SHA) assert.deepEqual(report.source, { commit: process.env.GITHUB_SHA, inputsEdited: false });
  for (const result of report.results) {
    for (const key of ["screenshot", "trace"]) {
      const bytes = await readFile(new URL(result[key], dist));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), result.sha256[key], result[key]);
    }
  }
  reports.push(report);
}
assert.deepEqual(reports[0].results[0], reports[1].results[0], "Reports reuse the same baseline capture.");
assert.equal(reports[0].status, "blocked");
assert.equal(reports[1].status, "ready");
console.log("Verified the evidence hashes and shared baseline.");

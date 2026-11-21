import assert from "node:assert/strict";
import test from "node:test";
import { verdict } from "../scripts/report.mjs";

const baseline = { id: "baseline", status: "passed" };
const candidate = { id: "candidate", status: "passed" };

test("the release needs passing baseline and candidate results", () => {
  assert.equal(verdict([baseline, candidate]), "ready");
  assert.equal(verdict([baseline, { ...candidate, status: "failed" }]), "blocked");
  assert.equal(verdict([{ ...baseline, status: "failed" }, candidate]), "blocked");
});

test("missing, skipped or duplicate results block the release", () => {
  assert.equal(verdict([]), "blocked");
  assert.equal(verdict([candidate]), "blocked");
  assert.equal(verdict([baseline, baseline]), "blocked");
  assert.equal(verdict([baseline, { ...candidate, status: "skipped" }]), "blocked");
});

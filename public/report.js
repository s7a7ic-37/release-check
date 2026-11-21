import report from "./report-data.js";

function element(tag, text, css) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (css) node.className = css;
  return node;
}

function link(destination, text, download = false) {
  const anchor = element("a", text);
  anchor.href = destination;
  if (download) anchor.download = "";
  return anchor;
}

const names = { baseline: "Baseline", candidate: "Release candidate" };
const statuses = { passed: "Passed", failed: "Failed", skipped: "Skipped" };
const verdict = document.getElementById("verdict");
const failure = report.results.flatMap(result => result.checks).find(check => check.status === "failed");
verdict.dataset.status = report.status;
document.getElementById("verdict-heading").textContent = report.status === "ready" ? "Release ready" : "Release blocked";
document.getElementById("reason").textContent = failure
  ? failure.name + ". Expected " + failure.expected + ", saw " + failure.observed + "."
  : "All required checks passed.";
document.getElementById("browser").textContent = report.browser;
document.getElementById("viewport").textContent = report.viewport + " px touch";
verdict.hidden = false;

const results = document.getElementById("results");
for (const result of report.results) {
  const card = element("section", null, "result");
  card.setAttribute("aria-labelledby", result.id + "-heading");
  const heading = element("div", null, "result-heading");
  const title = element("h2", names[result.id]);
  title.id = result.id + "-heading";
  const badge = element("span", statuses[result.status], "status");
  badge.dataset.status = result.status;
  heading.append(title, badge);

  const list = element("ol", null, "checklist");
  for (const check of result.checks) {
    const item = element("li");
    const status = element("span", statuses[check.status], "check-status");
    status.dataset.status = check.status;
    const line = element("div", null, "check");
    line.append(element("span", check.name), status);
    item.append(line);
    if (check.status === "failed") {
      item.append(element("p", "Expected " + check.expected + " · Saw " + check.observed, "observation"));
    }
    list.append(item);
  }

  const actions = element("div", null, "actions");
  actions.append(
    link("./fixture/" + result.id + "/", "Try checkout"),
    link("./" + result.screenshot, "Screenshot", true),
    link("./" + result.trace, "Trace ZIP", true),
  );
  const evidence = element("details", null, "evidence");
  evidence.append(element("summary", "Show captured screen"));
  const capture = element("img");
  capture.src = "./" + result.screenshot;
  capture.alt = names[result.id] + " checkout after the final executed check";
  capture.loading = "lazy";
  evidence.append(capture);
  card.append(heading, list, actions, evidence);
  results.append(card);
}

const generated = document.getElementById("generated");
generated.dateTime = report.createdAt;
generated.textContent = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
}).format(new Date(report.createdAt)) + " UTC";

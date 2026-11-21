# Release Check

A Playwright release gate for two versions of a fictional checkout. Both runs check standard delivery, switch to collection and check confirmation. The candidate deliberately leaves the old total after collection is selected. The report shows the mismatch and marks confirmation as skipped.

## Run locally

Use Node 24+ and Python 3.

    npm ci
    npx playwright install chromium
    npm test
    npm run build
    python -m http.server 4192 --bind 127.0.0.1 --directory dist

Open http://127.0.0.1:4192/. The build runs the fixed fixtures on 127.0.0.1:4191 and generates a static report, two screenshots and two traces. The dashboard links to each sample checkout so you can reproduce the result.

    npm run gate
    npx playwright show-trace dist/evidence/candidate.zip

The gate exits with 1 when a check blocks release, which is expected for the broken fixture. It exits with 0 when both versions pass, or 2 if the run cannot produce a report. Use the build command to publish the generated report regardless of its verdict.

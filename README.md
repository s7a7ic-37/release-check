# Release Check

A Playwright release gate for a fictional checkout. The report compares a shared baseline with either the broken candidate or its corrected checkout. Each runs the same checks for delivery, collection and order confirmation. The broken candidate leaves the old total after collection, so the confirmation check is skipped. The corrected checkout updates the total and reaches confirmation.

[Open the release report](https://release.artemislab.co.uk/).

## Run locally

Use Node 24+ and Python 3.

    npm ci
    npx playwright install chromium
    npm test
    npm run test:readiness
    npm run build
    python -m http.server 4192 --bind 127.0.0.1 --directory dist

Open http://127.0.0.1:4192/. The build runs only the fixed loopback fixtures on 127.0.0.1:4191. It publishes two static reports and three screenshots and traces, reusing the same baseline run in both reports. Choose a checkout on the dashboard to see its captured evidence.

The report records the Git revision when built from a checkout, and marks local changes to capture inputs. Use **Verify evidence files** to find the SHA-256 value for each screenshot or trace ZIP. After building, `node tests/evidence.mjs` recomputes those values from the files.

The readiness test delays the checkout script and checks that collection is unavailable until the controls work.

    npm run gate
    npm run gate -- --corrected
    npx playwright show-trace dist/evidence/candidate.zip

The default gate checks the broken candidate and exits with 1. With the corrected candidate it exits with 0 when both the baseline and candidate pass. A run that cannot produce reports exits with 2. Use the build command to generate the reports for publication regardless of their verdicts.

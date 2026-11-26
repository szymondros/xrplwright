# Scheduled runs in CI

`init --ci gitlab` or `--ci github` adds a job that runs the suite on a
schedule and on manual triggers, keeps the HTML report and traces as
artifacts, and publishes JUnit results.

- **GitLab**: add `E2E_BASE_URL` and the masked variable `E2E_WALLET_SEED`
  under Settings → CI/CD → Variables, then create a schedule under Build →
  Pipeline schedules.
- **GitHub**: add the repository variable `E2E_BASE_URL` and the secret
  `E2E_WALLET_SEED`, then adjust the `cron` line in `.github/workflows/e2e.yml`.

The generated jobs use the official Playwright Docker image (GitLab) or
`playwright install --with-deps` (GitHub). Everything runs headless, and no
extension has to be installed. An environment reachable only through a VPN
needs a runner inside that network.

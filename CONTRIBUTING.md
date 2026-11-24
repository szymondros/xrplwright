# Contributing

Issues and pull requests are welcome. For a larger change (a new wallet, a new
API), open an issue first so we can agree on the shape.

## Setup

```bash
npm install
npx playwright install chromium
npm run build
npm test          # library tests + the demo dapp's e2e tests (some hit XRPL Testnet)
```

| Path | What |
| --- | --- |
| `packages/xrplwright` | The library, CLI and `init` generator |
| `packages/create-xrplwright` | `npm init xrplwright`: a thin alias of `xrplwright init` |
| `examples/demo-dapp` | A small dapp using `@crossmarkio/sdk`, tested with xrplwright |
| `docs/GUIDE.md` | The user guide |

## Adding a wallet

A wallet is one class plus one in-page script, see
[docs/GUIDE.md → Adding a wallet](docs/GUIDE.md#9-adding-a-wallet). Read the
protocol from the wallet's SDK source, and add a test that drives the real SDK
(like `packages/xrplwright/tests/crossmark.spec.ts`).

## Pull requests

- Keep `npm run typecheck` and `npm test` green.
- Add a line to `CHANGELOG.md` under an "Unreleased" heading.
- Never commit a secret or seed, not even a Testnet one.

## Releasing (maintainers)

1. Set the same version in both `packages/*/package.json` (and the
   `xrplwright` dependency of `create-xrplwright`), move "Unreleased" in
   `CHANGELOG.md` under it, commit.
2. Tag and push: `git tag v0.2.0 && git push --tags`. The `release` workflow
   publishes both packages to npm with provenance.

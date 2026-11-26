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
| `docs/` | The user docs (index: `docs/README.md`); one page per wallet in `docs/wallets/` |
| `ROADMAP.md` | What comes next, by version |

## Adding a wallet

A wallet is one class plus one in-page script, see
[docs/adding-a-wallet.md](docs/adding-a-wallet.md). Read the
protocol from the wallet's SDK source, and add a test that drives the real SDK
(like `packages/xrplwright/tests/gemwallet.spec.ts`).

## Branches and pull requests

`main` is always releasable. Every change, maintainers' included, goes
through a branch and a pull request, so CI runs on it before it lands:

```bash
git switch -c feat/gemwallet      # feat/..., fix/..., docs/..., chore/...
# ...commit...
git push -u origin feat/gemwallet # then open a pull request to main
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org)
(`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), which keeps the
changelog easy to write. A release is a tag on `main`.

- Keep `npm run typecheck` and `npm test` green.
- Add a line to `CHANGELOG.md` under an "Unreleased" heading.
- Never commit a secret or seed, not even a Testnet one.

## Releasing (maintainers)

1. Set the same version in both `packages/*/package.json` (and the
   `xrplwright` dependency of `create-xrplwright`), move "Unreleased" in
   `CHANGELOG.md` under it, update `ROADMAP.md`, run
   `npm run readme -w xrplwright` (pins the npm README's links to the new tag), commit.
2. Tag and push: `git tag v0.2.0 && git push --tags`. The `release` workflow
   publishes both packages to npm with provenance.

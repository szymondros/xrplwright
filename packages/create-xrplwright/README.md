# create-xrplwright

Sets up [xrplwright](https://github.com/szymondros/xrplwright): Playwright end-to-end tests for XRP Ledger dapps.

```bash
npm init xrplwright my-e2e        # a separate e2e project in ./my-e2e
npm init xrplwright -- --here     # e2e tests inside the current project (./e2e)
npm init xrplwright               # asks which of the two
```

| Option | |
| --- | --- |
| `[dir]` | create a separate project in this folder |
| `--here` | add tests to the project in the current folder |
| `--tests-dir <name>` | folder for the tests inside a project (default `e2e`) |
| `--base-url <url>` | URL of the dapp (default `http://localhost:3000`) |
| `--ci gitlab\|github\|none` | add a scheduled CI job |
| `--no-install` | only write files |
| `-y` | no questions |

Same as `npx xrplwright init`. Existing files are never overwritten.

[MIT](https://github.com/szymondros/xrplwright/blob/main/LICENSE) © Szymon Droś

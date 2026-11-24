/**
 * `npx xrplwright init [dir] [options]`, also run by `npm init xrplwright`:
 *
 *   npm init xrplwright my-e2e      a separate e2e project in ./my-e2e
 *   npm init xrplwright -- --here   e2e tests inside the current project (./e2e)
 *   npm init xrplwright             asks which of the two
 *
 * Imports only Node built-ins, so it runs before Playwright is installed.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

import * as t from './templates.js';

const { version } = createRequire(import.meta.url)('../../package.json') as { version: string };
// The version that runs this generator is the one it installs.
const XRPLWRIGHT_SPEC = process.env.XRPLWRIGHT_SPEC ?? `xrplwright@^${version}`;
const PLAYWRIGHT_SPEC = '@playwright/test@^1.65.0';

const HELP = `Set up Playwright e2e tests for an XRP Ledger dapp, with xrplwright.

Usage:
  npm init xrplwright [dir] [-- options]
  npx xrplwright init [dir] [options]

  [dir]                 create a separate e2e project in this folder
  --here                add e2e tests to the project in the current folder
  --tests-dir <name>    folder for the tests inside a project (default: e2e)
  --base-url <url>      URL of the dapp under test (default: http://localhost:3000)
  --ci <gitlab|github|none>   add a scheduled CI job (default: none)
  --no-install          write the files only
  -y, --yes             accept the defaults, ask nothing
  -h, --help
`;

type Mode = { kind: 'standalone'; dir: string } | { kind: 'project'; dir: string; testsDir: string };

export async function runInit(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      here: { type: 'boolean', default: false },
      'tests-dir': { type: 'string', default: 'e2e' },
      'base-url': { type: 'string' },
      ci: { type: 'string' },
      'no-install': { type: 'boolean', default: false },
      yes: { type: 'boolean', short: 'y', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) return console.log(HELP);

  const interactive = !values.yes && process.stdin.isTTY;
  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;
  const ask = async (question: string, fallback: string) =>
    rl ? (await rl.question(`${question} (${fallback}) `)).trim() || fallback : fallback;

  try {
    const cwd = process.cwd();
    const hasProject = existsSync(join(cwd, 'package.json'));

    // 1. Where
    let mode: Mode;
    if (positionals[0]) {
      mode = { kind: 'standalone', dir: resolve(cwd, positionals[0]) };
    } else if (values.here) {
      mode = { kind: 'project', dir: cwd, testsDir: values['tests-dir']! };
    } else if (hasProject) {
      const answer = await ask(
        `Found package.json in ${basename(cwd)}. Add e2e tests to this project [p] or create a separate e2e project [s]?`,
        'p',
      );
      mode = answer.toLowerCase().startsWith('s')
        ? { kind: 'standalone', dir: resolve(cwd, await ask('Folder for the new project?', 'xrpl-e2e')) }
        : { kind: 'project', dir: cwd, testsDir: values['tests-dir']! };
    } else {
      const empty = readdirSync(cwd).filter((f) => !f.startsWith('.')).length === 0;
      const dir = await ask('Folder for the new e2e project?', empty ? '.' : 'xrpl-e2e');
      mode = { kind: 'standalone', dir: resolve(cwd, dir) };
    }

    // 2. What
    const baseURL = values['base-url'] ?? (await ask('URL of the dapp under test?', 'http://localhost:3000'));
    const ci = (values.ci ?? (await ask('Add a scheduled CI job? gitlab / github / none', 'none'))) as t.Ci;
    if (!['gitlab', 'github', 'none'].includes(ci)) throw new Error(`--ci must be gitlab, github or none, got "${ci}"`);

    rl?.close();

    const result = mode.kind === 'standalone' ? scaffoldStandalone(mode.dir, baseURL, ci) : scaffoldProject(mode, baseURL, ci);

    // 3. Install
    if (!values['no-install']) {
      const pm = detectPackageManager(result.projectDir);
      const add = { npm: ['install', '-D'], pnpm: ['add', '-D'], yarn: ['add', '-D'], bun: ['add', '-d'] }[pm];
      run(pm, [...add, PLAYWRIGHT_SPEC, XRPLWRIGHT_SPEC], result.projectDir);
      run('npx', ['playwright', 'install', 'chromium'], result.projectDir);
    }

    printNextSteps(result, values['no-install']!);
  } finally {
    rl?.close();
  }
}

interface Result {
  projectDir: string;
  configDir: string;
  runCommand: string;
  written: string[];
  skipped: string[];
  notes: string[];
}

function scaffoldStandalone(dir: string, baseURL: string, ci: t.Ci): Result {
  if (existsSync(dir) && readdirSync(dir).some((f) => !f.startsWith('.'))) {
    if (existsSync(join(dir, 'package.json'))) {
      throw new Error(`${dir} already has a package.json. To add tests to it, run this inside it with --here.`);
    }
    throw new Error(`${dir} is not empty.`);
  }
  mkdirSync(dir, { recursive: true });
  const o: t.TemplateOptions = { baseURL, dirnameExpr: 'import.meta.dirname', root: '', runCommand: 'npm test' };
  const r: Result = { projectDir: dir, configDir: dir, runCommand: 'npm test', written: [], skipped: [], notes: [] };

  const name = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'xrpl-e2e';
  writeNew(r, dir, 'package.json', JSON.stringify({
    name,
    private: true,
    type: 'module',
    scripts: {
      test: 'playwright test',
      'test:ui': 'playwright test --ui',
      'test:headed': 'playwright test --headed',
      report: 'playwright show-report',
    },
    devDependencies: { '@types/node': '^22.0.0', typescript: '^5.6.0' },
  }, null, 2) + '\n');
  writeNew(r, dir, 'playwright.config.ts', t.playwrightConfig(o));
  writeNew(r, dir, 'fixtures.ts', t.fixtures());
  writeNew(r, dir, 'tests/example.spec.ts', t.exampleSpec());
  writeNew(r, dir, '.env.example', t.envExample(o));
  writeNew(r, dir, '.gitignore', ['node_modules/', ...t.gitignoreLines('')].join('\n') + '\n');
  writeNew(r, dir, 'tsconfig.json', t.tsconfig());
  writeNew(r, dir, 'README.md', t.readme({ ...o, standalone: true }));
  if (ci === 'gitlab') writeNew(r, dir, '.gitlab-ci.yml', t.gitlabCi({ ...o, standalone: true }));
  if (ci === 'github') writeNew(r, dir, '.github/workflows/e2e.yml', t.githubWorkflow(o));
  return r;
}

function scaffoldProject(mode: Extract<Mode, { kind: 'project' }>, baseURL: string, ci: t.Ci): Result {
  const { dir, testsDir } = mode;
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) throw new Error(`No package.json in ${dir}. Use "npm init xrplwright <dir>" for a separate project.`);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const isModule = pkg.type === 'module';

  const runCommand = 'npm run test:e2e';
  const o: t.TemplateOptions = {
    baseURL,
    dirnameExpr: isModule ? 'import.meta.dirname' : '__dirname',
    root: testsDir,
    runCommand,
  };
  const configDir = join(dir, testsDir);
  const r: Result = { projectDir: dir, configDir, runCommand, written: [], skipped: [], notes: [] };

  writeNew(r, configDir, 'playwright.config.ts', t.playwrightConfig(o));
  writeNew(r, configDir, 'fixtures.ts', t.fixtures());
  writeNew(r, configDir, 'tests/example.spec.ts', t.exampleSpec());
  writeNew(r, configDir, '.env.example', t.envExample(o));
  writeNew(r, configDir, 'README.md', t.readme({ ...o, standalone: false }));

  // package.json: scripts only, never overwritten
  pkg.scripts ??= {};
  const scripts: Record<string, string> = {
    'test:e2e': `playwright test -c ${testsDir}`,
    'test:e2e:ui': `playwright test -c ${testsDir} --ui`,
  };
  const added: string[] = [];
  for (const [k, v] of Object.entries(scripts)) {
    if (pkg.scripts[k]) r.notes.push(`package.json already has a "${k}" script; left it as is (ours: ${v})`);
    else (pkg.scripts[k] = v), added.push(k);
  }
  if (added.length) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    r.written.push(`package.json (scripts: ${added.join(', ')})`);
  }

  // .gitignore: append what is missing
  const giPath = join(dir, '.gitignore');
  const existing = existsSync(giPath) ? readFileSync(giPath, 'utf8') : '';
  const missing = t.gitignoreLines(testsDir).filter((l) => !existing.split(/\r?\n/).includes(l));
  if (missing.length) {
    const sep = existing && !existing.endsWith('\n') ? '\n' : '';
    writeFileSync(giPath, `${existing}${sep}${existing ? '\n' : ''}# e2e (xrplwright)\n${missing.join('\n')}\n`);
    r.written.push('.gitignore (e2e entries)');
  }

  if (ci === 'gitlab') {
    writeNew(r, configDir, 'gitlab-ci.yml', t.gitlabCi({ ...o, standalone: false }));
    r.notes.push(`Include the CI job in .gitlab-ci.yml:  include: { local: '${testsDir}/gitlab-ci.yml' }`);
  }
  if (ci === 'github') writeNew(r, dir, '.github/workflows/e2e.yml', t.githubWorkflow(o));

  if (existsSync(join(dir, 'tsconfig.json'))) {
    r.notes.push(`If the app's own type-check or build picks up ${testsDir}/, add "${testsDir}" to "exclude" in tsconfig.json.`);
  }
  return r;
}

function writeNew(r: Result, base: string, path: string, content: string) {
  const full = join(base, path);
  const shown = relative(process.cwd(), full) || path;
  if (existsSync(full)) return void r.skipped.push(shown);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
  r.written.push(shown);
}

function detectPackageManager(dir: string): 'npm' | 'pnpm' | 'yarn' | 'bun' {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) return 'bun';
  if (existsSync(join(dir, 'package-lock.json'))) return 'npm';
  const agent = process.env.npm_config_user_agent ?? '';
  for (const pm of ['pnpm', 'yarn', 'bun'] as const) if (agent.startsWith(pm)) return pm;
  return 'npm';
}

function run(cmd: string, args: string[], cwd: string) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) throw new Error(`"${cmd} ${args.join(' ')}" failed`);
}

function printNextSteps(r: Result, skippedInstall: boolean) {
  const cd = relative(process.cwd(), r.projectDir);
  const env = relative(r.projectDir, join(r.configDir, '.env'));
  console.log('\nCreated:');
  for (const f of r.written) console.log(`  + ${f}`);
  for (const f of r.skipped) console.log(`  = ${f} (exists, not changed)`);
  for (const n of r.notes) console.log(`\n  ! ${n}`);
  console.log(`
Next:${cd ? `\n  cd ${cd}` : ''}${skippedInstall ? `\n  npm install -D ${PLAYWRIGHT_SPEC} ${XRPLWRIGHT_SPEC} && npx playwright install chromium` : ''}
  cp ${env}.example ${env}      # set E2E_BASE_URL (and E2E_WALLET_SEED for onboarded-user tests)
  ${r.runCommand}

Test account: npx xrplwright new-wallet   (funded Testnet seed; complete your dapp's onboarding with it)
`);
}


// Writes the package README (shown on npm) from the repository README, with
// relative links pointing at this version's tag on GitHub, so the npm page of
// every version links to the docs of that version. Runs on prepack.
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
const base = `https://github.com/szymondros/xrplwright/blob/v${pkg.version}/`;

// [text](relative/path) -> [text](https://github.com/.../blob/vX.Y.Z/relative/path)
const readme = source.replace(/\]\((?!https?:|#|mailto:)([^)]+)\)/g, (_, path) => `](${base}${path.replace(/^\.\//, '')})`);

writeFileSync(new URL('../README.md', import.meta.url), readme);
console.log(`README.md: links pinned to v${pkg.version}`);

#!/usr/bin/env node
// `npm init xrplwright` runs this package (npm's create-<name> convention).
// The generator lives in xrplwright itself: this is the same as `npx xrplwright init`.
import { runInit } from 'xrplwright/init';

runInit(process.argv.slice(2)).catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

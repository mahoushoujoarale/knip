#!/usr/bin/env node

import path from 'node:path';
import { parseArgs } from 'node:util';
import { main } from '.';
import { printHelp } from './help';
import reporters from './reporters';
import { ConfigurationError } from './util/errors';
import type { IssueGroup } from './types';

const {
  values: {
    help,
    dir,
    config: configFilePath = 'knip.json',
    tsConfig: tsConfigFilePath,
    include = [],
    exclude = [],
    ignore = [],
    'no-gitignore': isNoGitIgnore = false,
    dev: isDev = false,
    'no-progress': noProgress = false,
    reporter = 'symbols',
    'max-issues': maxIssues = '0',
    jsdoc: jsDoc = [],
  },
} = parseArgs({
  options: {
    help: { type: 'boolean' },
    config: { type: 'string', short: 'c' },
    tsConfig: { type: 'string', short: 't' },
    dir: { type: 'string' },
    include: { type: 'string', multiple: true },
    exclude: { type: 'string', multiple: true },
    ignore: { type: 'string', multiple: true },
    'no-gitignore': { type: 'boolean' },
    dev: { type: 'boolean' },
    'no-progress': { type: 'boolean' },
    'max-issues': { type: 'string' },
    reporter: { type: 'string' },
    jsdoc: { type: 'string', multiple: true },
  },
});

if (help) {
  printHelp();
  process.exit(0);
}

const cwd = process.cwd();
const workingDir = dir ? path.resolve(dir) : cwd;

const isShowProgress =
  noProgress === false ? process.stdout.isTTY && typeof process.stdout.cursorTo === 'function' : !noProgress;

const printReport =
  reporter in reporters ? reporters[reporter as keyof typeof reporters] : require(path.join(workingDir, reporter));

const run = async () => {
  try {
    const { report, issues, counters } = await main({
      cwd,
      workingDir,
      configFilePath,
      tsConfigFilePath,
      include,
      exclude,
      ignore,
      gitignore: !isNoGitIgnore,
      isDev,
      isShowProgress,
      jsDoc,
    });

    printReport({ report, issues, workingDir, isDev });

    const reportGroup = report.files ? 'files' : (Object.keys(report) as IssueGroup[]).find(key => report[key]);
    const counterGroup = reportGroup === 'unlisted' ? 'unresolved' : reportGroup;
    if (counterGroup) {
      const count = counters[counterGroup];
      if (count > Number(maxIssues)) process.exit(count);
    }
  } catch (error: unknown) {
    if (error instanceof ConfigurationError) {
      console.error(error.message + '\n');
      printHelp();
      process.exit(1);
    }
    // We should never arrive here, but also not swallow silently
    throw error;
  }
};

run();

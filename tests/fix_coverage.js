import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { genFile, origFile } from './generate_test_client.js';

rmSync(genFile, { force: true });

const coverageFilePath = 'lcov.info';

const coverageFile = readFileSync(coverageFilePath)
  .toString()
  .replaceAll(genFile, origFile);

writeFileSync(coverageFilePath, coverageFile);

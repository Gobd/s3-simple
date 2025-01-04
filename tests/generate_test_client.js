import { readFileSync, rmSync, writeFileSync } from 'node:fs';

export const origFile = 'src/index.ts';
export const genFile = 'tests/generated_test_client.ts';

const publicFile = readFileSync(origFile)
  .toString()
  .replace(/private /g, 'public ');

rmSync(genFile, { force: true });
writeFileSync(genFile, publicFile, { flag: 'wx' });

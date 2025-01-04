import { readFileSync } from 'node:fs';
import { importFromStringSync } from 'module-from-string';
import type { S3ClientOpts } from '../src';

const publicFile = readFileSync('./src/index.ts')
  .toString()
  .replace(/private /, 'public ');

export const S3Client = (a: S3ClientOpts): typeof s.S3Client => {
  const s = importFromStringSync(publicFile, {
    useCurrentGlobal: true,
    transformOptions: {
      target: 'es2022',
      loader: 'ts',
    },
  });
  return new s.S3Client(a);
};

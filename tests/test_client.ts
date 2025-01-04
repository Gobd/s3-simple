import { readFileSync } from 'node:fs';
import { importFromStringSync } from 'module-from-string';
import type { S3ClientOpts } from '../src';

export const S3Client = (a: S3ClientOpts): typeof s.S3Client => {
  let f = readFileSync('./src/index.ts').toString();
  const reps = ['cleanPath', 'date', 'sign', 'async do'];
  for (const rep of reps) {
    const regex = new RegExp(`private ${rep}\\(`, 'g');
    f = f.replace(regex, `public ${rep}(`);
  }
  const s = importFromStringSync(f, {
    useCurrentGlobal: true,
    transformOptions: {
      target: 'es2022',
      loader: 'ts',
    },
  });
  return new s.S3Client(a);
};

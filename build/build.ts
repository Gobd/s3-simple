import { execSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

await rm('./dist', { recursive: true, force: true });

execSync('npm run lint');
execSync('npm run ts-check');
execSync('npx tsc -p ./build/tsconfig.build.json');

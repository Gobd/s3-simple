import { readFileSync, rmSync, writeFileSync } from 'node:fs';

export const cleanup = () => {
  const exitEvents = [
    'exit',
    'SIGINT',
    'SIGHUP',
    'SIGQUIT',
    'SIGUSR1',
    'SIGUSR2',
    'uncaughtException',
    'SIGTERM',
  ];

  for (const eventType of exitEvents) {
    process.on(eventType, () => {
      console.log(`Received ${eventType} event`);
      rmSync(genFile, { force: true });
      // REPLACE tests/generated_test_client.ts with src/index.ts in lcov.info
      // TODO fix code coverage file if exists
    });
  }
};

const origFile = './src/index.ts';

const publicFile = readFileSync(origFile)
  .toString()
  .replace(/private /g, 'public ');

const genFile = './tests/generated_test_client.ts';
rmSync(genFile, { force: true });
writeFileSync(genFile, publicFile, { flag: 'wx' });

import { basename, dirname, extname, join } from 'node:path';
import { snapshot, suite, test } from 'node:test';
import { S3Client } from '../index.ts';

snapshot.setResolveSnapshotPath(generateSnapshotPath);

function generateSnapshotPath(testFilePath: string | undefined): string {
  if (!testFilePath) {
    return '';
  }
  const ext = extname(testFilePath);
  const filename = basename(testFilePath, ext);
  const base = dirname(testFilePath);
  return join(base, 'snaps', `${filename}.snap.cjs`);
}

suite('s3-simple', () => {
  test('should sign a simple GET request', async (t) => {
    const s3 = new S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
    });

    s3.date = () => new Date('2021-01-01T00:00:00Z');

    const r = s3.sign({
      method: 'GET',
      bucket: 'asdBucket',
      key: 'asdKey',
      extraHeaders: {},
      file: null,
    });
    t.assert.snapshot(r);
  });
});

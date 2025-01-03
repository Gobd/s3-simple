import { basename, dirname, extname, join } from 'node:path';
import { snapshot, suite, test } from 'node:test';
import { S3Client } from '../src/index.ts';

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

const s3 = new S3Client({
  accessKeyId: 'asdID',
  secretAccessKey: 'asdSecret',
});

s3.date = () => new Date('2021-01-01T00:00:00Z');

suite('s3-simple GET', () => {
  test('should sign a request', async (t) => {
    const r = s3.sign({
      method: 'GET',
      bucket: 'asdBucket',
      key: 'asdKey',
      extraHeaders: {},
      file: null,
    });
    t.assert.snapshot(r);
  });
  test('should sign a request with extra headers', async (t) => {
    const r = s3.sign({
      method: 'GET',
      bucket: 'asdBucket',
      key: 'asdKey',
      extraHeaders: {
        'x-amz-acl': 'public-read',
      },
      file: null,
    });
    t.assert.snapshot(r);
  });
});

suite('s3-simple DELETE', () => {
  test('should sign a request', async (t) => {
    const r = s3.sign({
      method: 'DELETE',
      bucket: 'asdBucket',
      key: 'asdKey',
      extraHeaders: {},
      file: null,
    });
    t.assert.snapshot(r);
  });
  test('should sign a request with extra headers', async (t) => {
    const r = s3.sign({
      method: 'DELETE',
      bucket: 'asdBucket',
      key: 'asdKey',
      extraHeaders: {
        'x-amz-acl': 'public-read',
      },
      file: null,
    });
    t.assert.snapshot(r);
  });
});

suite('s3-simple PUT', () => {
  test('should sign a request', async (t) => {
    const r = s3.sign({
      method: 'PUT',
      bucket: 'asdBucket',
      key: 'asdKey',
      extraHeaders: {},
      file: {
        content: 'asdzasdi',
      },
    });
    t.assert.snapshot(r);
  });
  test('should sign a request with extra headers', async (t) => {
    const r = s3.sign({
      method: 'PUT',
      bucket: 'asdBucket',
      key: 'asdKey',
      extraHeaders: {
        'x-amz-acl': 'public-read',
      },
      file: {
        content: 'asdzasdi',
        contentType: 'text/plain',
      },
    });
    t.assert.snapshot(r);
  });
});

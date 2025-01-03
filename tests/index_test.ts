import { createServer } from 'node:http';
import type { IncomingMessage, Server } from 'node:http';
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

const s3sess = new S3Client({
  accessKeyId: 'asdID',
  secretAccessKey: 'asdSecret',
  sessionToken: 'asdToken',
});

s3.date = () => new Date('2021-01-01T00:00:00Z');
s3sess.date = () => new Date('2021-01-01T00:00:00Z');

suite('s3-simple GET', () => {
  test('should sign a request', async (t) => {
    const r = s3.sign({
      method: 'GET',
      bucket: ' ./asdBucket/ ',
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
  test('should sign with session token', async (t) => {
    const r = s3sess.sign({
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

interface IntegResponse {
  req: IncomingMessage;
  body: string;
}

function createServerPromise(
  port: number,
  resp: string,
  statusCodes: number[],
  f: (IntegResponse) => void,
): Promise<Server> {
  return new Promise((resolve, reject) => {
    let respIndex = 0;
    const server = createServer((req, res) => {
      if (req.method === 'PUT') {
        const body = [];

        req.on('data', (chunk) => {
          body.push(chunk);
        });

        req.on('end', () => {
          const bodyString = Buffer.concat(body).toString();

          f({
            req,
            body: bodyString,
          });

          res.writeHead(statusCodes[respIndex], {
            'Content-Type': 'text/plain',
          });
          res.end(resp);
        });
      } else {
        f({
          req,
          body: '',
        });

        res.writeHead(statusCodes[respIndex], { 'Content-Type': 'text/plain' });
        respIndex++;
        res.end(resp);
      }
    });

    server.listen(port, () => {
      resolve(server);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

suite('s3-simple GET integration', () => {
  test('should get a file', async (t) => {
    const s3 = new S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
      apiURL: 'http://localhost:3000',
    });
    const b = 'Hello World!';
    const server = await createServerPromise(3000, b, [200], () => {});
    try {
      const r = await s3.get('asdBucket', 'asdKey');
      t.assert.equal(r, b);
      server.close();
    } catch (e) {
      server.close();
      t.assert.fail(e);
    }
  });
});

suite('s3-simple PUT integration', () => {
  test('should get a file', async (t) => {
    const s3 = new S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
      apiURL: 'http://localhost:3001',
    });
    s3.date = () => new Date('2021-01-01T00:00:00Z');
    const b = 'Hello World!';
    const k = 'asdKey';
    const putFile = {
      content: 'asdContent',
      contentType: 'text/asd',
    };
    const extraHeaders = {
      'x-amz-acl': 'public-read',
    };
    const server = await createServerPromise(
      3001,
      b,
      [200],
      (f: IntegResponse) => {
        t.assert.equal(f.body, putFile.content);
        t.assert.equal(
          f.req.headers.authorization,
          'AWS asdID:VhfvzX9y1ATtWm5KO8w1XXIggMs=',
        );
        t.assert.equal(f.req.headers['x-amz-acl'], 'public-read');
        t.assert.equal(f.req.headers.date, '20210101T000000Z');
        t.assert.equal(
          f.req.headers['content-md5'],
          'FeiUjHdfsnFQmhKwXUpHRA==',
        );
        t.assert.equal(f.req.headers['content-type'], 'text/asd');
        t.assert.equal(f.req.url, `/${k}`);
      },
    );
    try {
      const r = await s3.put('asdBucket', k, putFile, extraHeaders);
      server.close();
    } catch (e) {
      server.close();
      t.assert.fail(e);
    }
  });
});

import { createServer } from 'node:http';
import type { IncomingMessage, Server } from 'node:http';
import { basename, dirname, extname, join } from 'node:path';
import { snapshot, suite, test } from 'node:test';
import type { Mock } from 'node:test';
import { S3Client } from './test_client.ts';

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

const s3 = S3Client({
  accessKeyId: 'asdID',
  secretAccessKey: 'asdSecret',
});

const s3sess = S3Client({
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
  respIndex: number;
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
      let body = '';
      if (req.method === 'PUT') {
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          f({
            req,
            body,
            respIndex,
          });
          res.writeHead(statusCodes[respIndex], {
            'Content-Type': 'text/plain',
          });
          res.end(resp, () => req.socket.unref());
        });
      } else {
        f({
          req,
          body,
          respIndex,
        });
        res.writeHead(statusCodes[respIndex], { 'Content-Type': 'text/plain' });
        respIndex++;
        res.end(resp, () => req.socket.unref());
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

suite('s3-simple GET local integration', () => {
  test('should get a file', async (t) => {
    const s3 = S3Client({
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

suite('s3-simple PUT local integration', () => {
  test('should get a file', async (t) => {
    const s3 = S3Client({
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

suite('s3-simple retries', () => {
  test('should retry default times', async (t) => {
    global.fetch = fetch;
    const s3 = S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
      apiURL: 'http://localhost:3004',
    });

    t.mock.method(s3, 'do');

    const b = 'Hello World!';
    const server = await createServerPromise(
      3004,
      b,
      [400, 400, 400, 400],
      () => {},
    );
    try {
      const r = await s3.get('asdBucket', 'asdKey');
      server.close();
    } catch (e) {
      t.assert.equal((s3.do as Mock<typeof s3.do>).mock.callCount(), 3);
      server.close();
    }
  });
  test('should retry default times but succeed', async (t) => {
    const s3 = S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
      apiURL: 'http://localhost:3005',
    });

    t.mock.method(s3, 'do');

    const b = 'Hello World!';
    const server = await createServerPromise(
      3005,
      b,
      [400, 400, 200],
      () => {},
    );
    try {
      const r = await s3.get('asdBucket', 'asdKey');
      t.assert.equal((s3.do as Mock<typeof s3.do>).mock.callCount(), 2);
      server.close();
    } catch (e) {
      server.close();
    }
  });
  test('should retry 2 times', async (t) => {
    const s3 = S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
      apiURL: 'http://localhost:3006',
      retries: 2,
    });

    t.mock.method(s3, 'do');

    const b = 'Hello World!';
    const server = await createServerPromise(
      3006,
      b,
      [400, 400, 400, 400],
      () => {},
    );
    try {
      const r = await s3.get('asdBucket', 'asdKey');
      server.close();
    } catch (e) {
      t.assert.equal((s3.do as Mock<typeof s3.do>).mock.callCount(), 2);
      server.close();
    }
  });
  test('should retry 5 times', async (t) => {
    const s3 = S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
      apiURL: 'http://localhost:3007',
      retries: 55,
    });

    t.mock.method(s3, 'do');

    const b = 'Hello World!';
    const server = await createServerPromise(
      3007,
      b,
      [400, 400, 400, 400, 400, 400],
      () => {},
    );
    try {
      const r = await s3.get('asdBucket', 'asdKey');
      server.close();
    } catch (e) {
      t.assert.equal((s3.do as Mock<typeof s3.do>).mock.callCount(), 5);
      server.close();
    }
  });
  test('should retry 0 times', async (t) => {
    const s3 = S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
      apiURL: 'http://localhost:3008',
      retries: 0,
    });

    t.mock.method(s3, 'do');

    const b = 'Hello World!';
    const server = await createServerPromise(
      3008,
      b,
      [400, 400, 400, 400, 400, 400],
      () => {},
    );
    try {
      const r = await s3.get('asdBucket', 'asdKey');
      server.close();
    } catch (e) {
      t.assert.equal((s3.do as Mock<typeof s3.do>).mock.callCount(), 1);
      server.close();
    }
  });
  test('should retry 0 times negative', async (t) => {
    const s3 = S3Client({
      accessKeyId: 'asdID',
      secretAccessKey: 'asdSecret',
      apiURL: 'http://localhost:3009',
      retries: -5,
    });

    t.mock.method(s3, 'do');

    const b = 'Hello World!';
    const server = await createServerPromise(
      3009,
      b,
      [400, 400, 400, 400, 400, 400],
      () => {},
    );
    try {
      const r = await s3.get('asdBucket', 'asdKey');
      server.close();
    } catch (e) {
      t.assert.equal((s3.do as Mock<typeof s3.do>).mock.callCount(), 1);
      server.close();
    }
  });
});

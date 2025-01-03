import { snapshot, suite, test } from 'node:test';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { S3Client } from '../src/index.ts';
import type { S3Response } from '../src/index.ts';

const { accessKeyId, secretAccessKey, sessionToken } =
  await fromNodeProviderChain()();

const s3 = new S3Client({
  accessKeyId,
  secretAccessKey,
  sessionToken,
});

suite('s3-simple integration', () => {
  test('should work with S3', async (t) => {
    if (!process.env.INTEGRATION) {
      t.skip('Integration tests are disabled');
    }

    const deleteResp = await s3.delete(
      'la-profefe',
      '/asd/asd/zzzz asd zzz.js',
    );
    t.assert.equal((deleteResp as S3Response).Status, 204, 'delete at start');

    const content = 'pasosadisod';

    const putResp = await s3.put(
      'la-profefe',
      '/asd/asd/zzzz asd zzz.js',
      {
        content,
        contentType: 'jpeg',
      },
      {
        'x-amz-acl': 'public-read',
      },
    );
    t.assert.equal((putResp as S3Response).Status, 200, 'put file');

    const getResp = await s3.get('la-profefe', '/asd/asd/zzzz asd zzz.js');
    t.assert.equal(getResp, content, 'get file');

    const deleteAgainResp = await s3.delete(
      'la-profefe',
      '/asd/asd/zzzz asd zzz.js',
    );
    t.assert.equal(
      (deleteAgainResp as S3Response).Status,
      204,
      'delete file at end',
    );

    try {
      const getAgainResp = await s3.get(
        'la-profefe',
        '/asd/asd/zzzz asd zzz.js',
      );
    } catch (e) {
      t.assert.equal(
        (e as S3Response).Status,
        404,
        'get file that has been deleted',
      );
    }
  });
});
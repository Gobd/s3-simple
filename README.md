# s3-simple

## Usage

```typescript
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
const { accessKeyId, secretAccessKey, sessionToken } =
  await fromNodeProviderChain()();

const s3 = new S3Client({
  accessKeyId,
  secretAccessKey,
  sessionToken,
});
console.log(
  await s3.put('bucket', '/asd/asd/zzzz asd zzz.js', {
    content: 'pasosadisod',
    contentType: 'jpeg',
  },
  {
    'x-amz-acl': 'public-read',
  }),
);
console.log(await s3.get('bucket', '/asd/asd/zzzz asd zzz.js'));
console.log(await s3.delete('bucket', '/asd/asd/zzzz asd zzz.js'));
console.log(await s3.get('bucket', '/asd/asd/zzzz asd zzz.js')); // Will error because it was deleted
```

Pass in credentials however you like. You might be able to get the ENV vars and pass those in or you might need to use fromNodeProviderChain like in this example.

## Building

Wil output to a top-level dist folder.

```shell
npm install
./build/build.sh
```

## Testing

```shell
npm install
npm run test
# Or for coverage
npm run coverage
```

There are also a recommended VSCode extensions that will help run tests and show coverage in the editor.

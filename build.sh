#!/bin/sh

set -ex

rm -rf ./dist

npm run lint
npm run ts-check

sed -i.bak 's/public cleanPath(/private cleanPath(/' index.ts
sed -i.bak 's/public date(/private date(/' index.ts
sed -i.bak 's/public sign(/private sign(/' index.ts

npm run build

sed -i.bak 's/private cleanPath(/public cleanPath(/' index.ts
sed -i.bak 's/private date(/public date(/' index.ts
sed -i.bak 's/private sign(/public sign(/' index.ts

rm -rf index.ts.bak

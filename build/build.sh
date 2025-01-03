#!/bin/sh

set -ex

rm -rf ./dist

npm run lint
npm run ts-check

sed -i.bak 's/public cleanPath(/private cleanPath(/' ./src/index.ts
sed -i.bak 's/public date(/private date(/' ./src/index.ts
sed -i.bak 's/public sign(/private sign(/' ./src/index.ts
sed -i.bak 's/public async do(/private async do(/' ./src/index.ts

npm run build

sed -i.bak 's/private cleanPath(/public cleanPath(/' ./src/index.ts
sed -i.bak 's/private date(/public date(/' ./src/index.ts
sed -i.bak 's/private sign(/public sign(/' ./src/index.ts
sed -i.bak 's/private async do(/public async do(/' ./src/index.ts

rm -rf ./src/index.ts.bak

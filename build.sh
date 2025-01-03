#!/bin/sh

set -ex

rm -rf ./dist

sed -i.bak 's/public cleanPath(/private cleanPath(/' filename
sed -i.bak 's/public date(/private date(/' filename
sed -i.bak 's/public sign(/private sign(/' filename

npm run lint
npm run ts-check
npm run build

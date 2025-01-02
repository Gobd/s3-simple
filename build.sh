#!/bin/sh

set -ex

rm -rf ./dist

npm run lint
npm run ts-check
npm run build

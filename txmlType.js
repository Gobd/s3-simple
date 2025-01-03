import { readFileSync, writeFileSync } from 'node:fs';

const filePath = 'node_modules/txml/package.json';
const packageFile = readFileSync(filePath);
const packageFileParsed = JSON.parse(packageFile);
packageFileParsed.exports['./txml'].types = './dist/txml.d.ts';
writeFileSync(filePath, JSON.stringify(packageFileParsed, null, 2));

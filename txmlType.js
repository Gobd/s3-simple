import { readFileSync, writeFileSync } from 'node:fs';

// This file exists to fix the type definitions for the txml package
// without it there were tsc errors when trying to import the package

const filePath = 'node_modules/txml/package.json';
const packageFile = readFileSync(filePath);
const packageFileParsed = JSON.parse(packageFile);
packageFileParsed.exports['./txml'].types = './dist/txml.d.ts';
writeFileSync(filePath, JSON.stringify(packageFileParsed, null, 2));

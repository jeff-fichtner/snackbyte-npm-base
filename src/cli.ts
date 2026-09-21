#!/usr/bin/env node
// Stub CLI. Present only in spin-outs created with --cli; package.json's `bin` points at
// the built dist/cli.js (a bare path — npm strips a "./" prefix silently on publish).
import { hello } from './index.js';

console.log(hello(process.argv[2] ?? 'world'));

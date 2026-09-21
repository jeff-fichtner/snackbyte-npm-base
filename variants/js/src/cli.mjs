#!/usr/bin/env node
// Stub CLI. Present only in spin-outs created with --cli; package.json's `bin` points at
// this file directly (source-shipped, no build; a bare path — npm strips "./" silently).
import { hello } from './index.mjs';

console.log(hello(process.argv[2] ?? 'world'));

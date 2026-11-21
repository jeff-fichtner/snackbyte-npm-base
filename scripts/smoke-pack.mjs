#!/usr/bin/env node
/**
 * The pack-and-install smoke test. It tests what users get, not the working tree: builds
 * the package fresh when it has a build, packs the tarball, proves a planted `.env` is not
 * in it, installs the tarball into a throwaway consumer project, imports the package by
 * name, and runs its `bin` if it has one. The minimum bar before any publish.
 *
 * The build runs first so the tarball is what this source produces now: `build` empties
 * dist/ before compiling, so a module deleted from src/ cannot ship from an old build.
 *
 * Each bin runs as `<bin> smoke` and must exit 0. A CLI with no such command (a server
 * whose no-argument form never exits, say) declares the arguments to pass instead, in
 * package.json: `"config": { "smokeBinArgs": ["--help"] }`.
 *
 *   npm run smoke:pack
 *
 * No dependencies; no network beyond what `npm install` of a local tarball needs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const binArgs = smokeBinArgs(pkg);

/**
 * The arguments each bin is run with: package.json `config.smokeBinArgs`, or `smoke`.
 * @param {Record<string, any>} manifest
 */
function smokeBinArgs(manifest) {
  const declared = manifest.config?.smokeBinArgs;
  if (declared === undefined) return ['smoke'];
  if (!Array.isArray(declared) || !declared.every((a) => typeof a === 'string')) {
    console.error(
      'smoke:pack — FAILED: package.json config.smokeBinArgs must be an array of strings',
    );
    process.exit(1);
  }
  return declared;
}

/** @param {string} message */
function fail(message) {
  // Throw, never process.exit(): an exit inside the try below skips `finally` and leaves
  // the planted decoy .env in the working tree.
  throw new Error(message);
}
/** @param {string} message */
const step = (message) => console.log(`smoke:pack — ${message}`);

/** @param {string} cmd @param {string[]} args @param {string} cwd */
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) fail(`${cmd} ${args.join(' ')} (in ${cwd}) exited ${r.status}\n${r.stderr}`);
  return r.stdout;
}

const decoy = join(root, '.env');
const plantedDecoy = !existsSync(decoy);
if (plantedDecoy) writeFileSync(decoy, 'SMOKE_DECOY=1\n');
const tmp = mkdtempSync(join(tmpdir(), 'smoke-pack-'));
let failed = false;

try {
  // 1. build fresh (when there is a build), pack, and read what went into the tarball
  if (pkg.scripts?.build !== undefined) {
    run(npm, ['run', 'build'], root);
    step('built');
  }
  const packed = JSON.parse(run(npm, ['pack', '--json', '--pack-destination', tmp], root));
  const { filename, files } = packed[0];
  const names = files.map((f) => f.path);
  step(`packed ${filename}: ${names.join(', ')}`);

  // 2. the tarball is the allowlist and nothing else
  if (names.includes('.env')) fail('.env is in the tarball — the files allowlist is wrong');
  for (const required of ['package.json', 'README.md', 'LICENSE']) {
    if (!names.includes(required)) fail(`${required} is missing from the tarball`);
  }
  step('decoy .env absent; package.json, README.md, LICENSE present');

  // 3. a throwaway consumer installs it by tarball
  const consumer = join(tmp, 'consumer');
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' }),
  );
  run(
    npm,
    ['install', join(tmp, filename), '--no-audit', '--no-fund', '--prefer-offline'],
    consumer,
  );
  step('installed by tarball into a clean consumer');

  // 4. import by name — the exports map is what is under test here
  const imported = run(
    process.execPath,
    [
      '-e',
      `import(${JSON.stringify(pkg.name)}).then(m => { if (Object.keys(m).length === 0) { console.error("no exports"); process.exit(1); } console.log(Object.keys(m).join(",")); })`,
    ],
    consumer,
  );
  step(`import ok (exports: ${imported.trim()})`);

  // 5. the bin, if any, is linked and runs, with `binArgs` (`smoke` unless declared). A
  //    CLI whose first argument is a path needs that path to exist, so seed a `smoke/`
  //    fixture in the consumer. The template's stub CLI just greets it.
  if (pkg.bin !== undefined) {
    mkdirSync(join(consumer, 'smoke'));
    writeFileSync(join(consumer, 'smoke', 'smoke.md'), '# Smoke\n\nA fixture for the bin.\n');
    const keys = typeof pkg.bin === 'string' ? [pkg.name.split('/')[1]] : Object.keys(pkg.bin);
    for (const key of keys) {
      const link = join(consumer, 'node_modules', '.bin', key);
      if (!existsSync(link))
        fail(`bin "${key}" was not linked at ${link} — check the bin path has no "./" prefix`);
      run(link, binArgs, consumer);
    }
    step(`bin ok (${keys.join(', ')} ${binArgs.join(' ')})`);
  }

  step('PASSED');
} catch (error) {
  failed = true;
  console.error(`smoke:pack — FAILED: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  if (plantedDecoy) rmSync(decoy, { force: true });
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);

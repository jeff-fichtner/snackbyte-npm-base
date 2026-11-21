#!/usr/bin/env node
/**
 * The local-registry publish round-trip: the strongest pre-publish check that touches
 * nothing real. Starts a throwaway Verdaccio on localhost, runs the REAL `npm publish`
 * code path against it (so `prepublishOnly` — build, check:all, --exists — fires),
 * installs the package BY NAME from that registry into a fresh consumer, imports it and
 * runs its bin. Credential-free; nothing is ever PUBLISHED to npmjs.org — the local
 * registry proxies reads for everything outside our scope, so a package's runtime
 * dependencies resolve, but our scope has no uplink and cannot leak through.
 *
 *   npm run smoke:registry
 *
 * Verdaccio 6 disables self-registration, so the scope is `publish: $anonymous`, and a
 * dummy token for the local registry goes in a PROJECT-LOCAL .npmrc — git-ignored — which
 * this script deletes on exit, success or failure, so it can never redirect a real
 * publish. The publish and the install both name the local registry on the command line:
 * an `npm_config_registry` in the environment outranks a project .npmrc, and would
 * otherwise send this publish to whatever registry it names.
 *
 * Each bin runs as `<bin> smoke` and must exit 0, unless package.json declares other
 * arguments: `"config": { "smokeBinArgs": ["--help"] }`.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npmrc = join(root, '.npmrc');
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
      'smoke:registry — FAILED: package.json config.smokeBinArgs must be an array of strings',
    );
    process.exit(1);
  }
  return declared;
}

/** @param {string} message */
const step = (message) => console.log(`smoke:registry — ${message}`);

if (existsSync(npmrc)) {
  console.error(
    `smoke:registry — FAILED: ${npmrc} already exists; it would be overwritten and deleted. Move it first.`,
  );
  process.exit(1);
}

/** Pick a free localhost port. */
function freePort() {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (srv.address());
      srv.close(() => resolvePort(port));
    });
  });
}

/** @param {string} url */
async function waitFor(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`registry did not come up at ${url}`);
}

/** @param {string} cmd @param {string[]} args @param {string} cwd */
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')} (in ${cwd}) exited ${r.status}\n${r.stdout}\n${r.stderr}`,
    );
  }
  return r.stdout;
}

const tmp = mkdtempSync(join(tmpdir(), 'smoke-registry-'));
/** @type {import('node:child_process').ChildProcess | undefined} */
let verdaccio;
let failed = false;

try {
  const port = await freePort();
  const registry = `http://localhost:${port}/`;

  // 1. a registry that accepts anonymous publishes for our scope, has NO uplink for our
  //    scope (so nothing can fall through to the real registry), and proxies reads for
  //    everything else so a package's runtime dependencies install. Known limit: a
  //    runtime dependency on ANOTHER package in our scope will not resolve here, by
  //    the same rule — that case needs the dependency published locally first.
  const storage = join(tmp, 'storage');
  mkdirSync(storage);
  const config = join(tmp, 'config.yaml');
  writeFileSync(
    config,
    [
      `storage: ${storage}`,
      'auth:',
      '  htpasswd:',
      `    file: ${join(tmp, 'htpasswd')}`,
      '    max_users: -1',
      'uplinks:',
      '  npmjs:',
      '    url: https://registry.npmjs.org/',
      'packages:',
      `  '${pkg.name.split('/')[0]}/*':`,
      '    access: $all',
      '    publish: $anonymous',
      '    unpublish: $anonymous',
      "  '**':",
      '    access: $all',
      '    proxy: npmjs',
      'log: { type: stdout, format: pretty, level: warn }',
      '',
    ].join('\n'),
  );
  verdaccio = spawn(npx, ['--yes', 'verdaccio@6', '--config', config, '--listen', String(port)], {
    cwd: tmp,
    stdio: 'ignore',
  });
  await waitFor(`${registry}-/ping`);
  step(`Verdaccio up on ${registry}`);

  // 2. a dummy token for it, in a git-ignored project-local .npmrc. The registry line is
  //    a second guard for anything else run here; the publish below names it outright.
  writeFileSync(npmrc, `registry=${registry}\n//localhost:${port}/:_authToken=smoke\n`);

  // 3. the real publish code path — prepublishOnly runs here. `--registry` on the command
  //    line outranks an npm_config_registry in the environment; the .npmrc does not.
  run(npm, ['publish', '--access', 'public', '--registry', registry], root);
  step(`published ${pkg.name}@${pkg.version} to the local registry (prepublishOnly ran)`);

  // 4. a fresh consumer installs it BY NAME from that registry
  const consumer = join(tmp, 'consumer');
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' }),
  );
  run(
    npm,
    ['install', `${pkg.name}@${pkg.version}`, '--registry', registry, '--no-audit', '--no-fund'],
    consumer,
  );
  step('installed by name from the local registry');

  const imported = run(
    process.execPath,
    [
      '-e',
      `import(${JSON.stringify(pkg.name)}).then(m => { if (Object.keys(m).length === 0) { console.error("no exports"); process.exit(1); } console.log(Object.keys(m).join(",")); })`,
    ],
    consumer,
  );
  step(`import ok (exports: ${imported.trim()})`);

  // Each bin runs with `binArgs` (`smoke` unless declared); a CLI whose first argument is
  // a path needs it to exist, so seed a `smoke/` fixture in the consumer (the stub CLI
  // just greets it).
  if (pkg.bin !== undefined) {
    mkdirSync(join(consumer, 'smoke'));
    writeFileSync(join(consumer, 'smoke', 'smoke.md'), '# Smoke\n\nA fixture for the bin.\n');
    const keys = typeof pkg.bin === 'string' ? [pkg.name.split('/')[1]] : Object.keys(pkg.bin);
    for (const key of keys) {
      const link = join(consumer, 'node_modules', '.bin', key);
      if (!existsSync(link)) throw new Error(`bin "${key}" was not linked after a by-name install`);
      run(link, binArgs, consumer);
    }
    step(`bin ok (${keys.join(', ')} ${binArgs.join(' ')})`);
  }
  step('PASSED');
} catch (error) {
  failed = true;
  console.error(
    `smoke:registry — FAILED: ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  rmSync(npmrc, { force: true });
  verdaccio?.kill();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);

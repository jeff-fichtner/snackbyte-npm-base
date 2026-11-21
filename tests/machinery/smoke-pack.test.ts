import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPIN_OUT_TIMEOUT_MS, exists, install, npm, resolver, scratch } from './helpers.js';

const s = scratch();
afterAll(() => s.cleanup());

function spinOut(name: string, flags: string[]): string {
  const out = join(s.dir, name);
  const r = resolver([
    `--name=${name}`,
    `--repo=https://example.com/o/${name}`,
    `--out=${out}`,
    ...flags,
  ]);
  expect(r.status, r.stderr).toBe(0);
  const i = install(out);
  expect(i.status, i.stderr).toBe(0);
  return out;
}

function editPackageJson(out: string, edit: (pkg: Record<string, unknown>) => void) {
  const path = join(out, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  edit(pkg);
  writeFileSync(path, JSON.stringify(pkg, null, 2));
}

// A failing run must still clean up, and must exit 1 with the reason: an exit that skips
// `finally` would leave the planted decoy .env in the working tree.
describe('smoke:pack on a failing package', () => {
  it(
    'exits 1 naming the problem and removes the decoy .env it planted',
    () => {
      const out = spinOut('bad-js', ['--source=js']);

      // Break the allowlist so the planted .env ships — the exact failure the decoy exists
      // to catch, and one smoke:pack detects after planting it. (npm always includes
      // README/LICENSE regardless of `files`, so those can't be used to force a failure.)
      editPackageJson(out, (pkg) => (pkg.files = ['src/', '.env']));

      const smoke = npm(['run', 'smoke:pack'], out);
      expect(smoke.status).toBe(1);
      expect(smoke.stderr).toContain('.env is in the tarball');
      expect(exists(join(out, '.env')), 'decoy .env must be removed on failure').toBe(false);
    },
    SPIN_OUT_TIMEOUT_MS,
  );
});

// The tarball is what the source builds to now: smoke:pack builds first, and the build
// empties dist/, so a module deleted from src/ after an earlier build never ships.
describe('smoke:pack in a ts package built before', () => {
  it(
    'packs a fresh build: a module deleted from src/ is absent from the tarball',
    () => {
      const out = spinOut('stale-ts', []);
      writeFileSync(join(out, 'src/gone.ts'), 'export const gone = true;\n');
      const b = npm(['run', 'build'], out);
      expect(b.status, b.stdout + b.stderr).toBe(0);
      expect(exists(join(out, 'dist/gone.js'))).toBe(true);
      rmSync(join(out, 'src/gone.ts'));

      const smoke = npm(['run', 'smoke:pack'], out);
      expect(smoke.status, smoke.stdout + smoke.stderr).toBe(0);
      expect(smoke.stdout).toContain('smoke:pack — built');
      expect(smoke.stdout).toContain('dist/index.js');
      expect(smoke.stdout).not.toContain('dist/gone');
      expect(exists(join(out, 'dist/gone.js')), 'build must empty dist/ first').toBe(false);
    },
    SPIN_OUT_TIMEOUT_MS,
  );
});

// A bin with no `smoke` command declares the arguments its smoke run passes, so a
// spin-out never edits the scripts.
describe('smoke:pack runs each bin with its declared arguments', () => {
  it(
    'defaults to `smoke`, uses config.smokeBinArgs when set, and refuses a malformed value',
    () => {
      const out = spinOut('args-js', ['--source=js', '--cli']);
      // a CLI that knows only --help, like a server whose bare form never exits
      writeFileSync(
        join(out, 'src/cli.mjs'),
        "#!/usr/bin/env node\nif (process.argv[2] !== '--help') process.exit(3);\nconsole.log('usage');\n",
      );

      const byDefault = npm(['run', 'smoke:pack'], out);
      expect(byDefault.status).toBe(1);
      expect(byDefault.stderr).toContain('exited 3');

      editPackageJson(out, (pkg) => (pkg.config = { smokeBinArgs: ['--help'] }));
      const declared = npm(['run', 'smoke:pack'], out);
      expect(declared.status, declared.stdout + declared.stderr).toBe(0);
      expect(declared.stdout).toContain('bin ok (args-js --help)');

      editPackageJson(out, (pkg) => (pkg.config = { smokeBinArgs: '--help' }));
      const malformed = npm(['run', 'smoke:pack'], out);
      expect(malformed.status).toBe(1);
      expect(malformed.stderr).toContain('config.smokeBinArgs must be an array of strings');
    },
    SPIN_OUT_TIMEOUT_MS,
  );
});

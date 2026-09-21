import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { productPaths } from '../../scripts/init.mjs';
import {
  SPIN_OUT_TIMEOUT_MS,
  exists,
  install,
  npm,
  resolver,
  run,
  scratch,
  tree,
} from './helpers.js';

// The explicit opt-out, without a CLI: source-shipped .mjs, no build, the js publish
// contract, the relaxed checkJs profile, and green on its own gate.
// (spec 000 FR-006; quickstart §3)

const s = scratch();
const out = join(s.dir, 'demo-js');
const REPO = 'https://example.com/o/demo-js';

beforeAll(() => {
  const r = resolver([
    '--name=@snackbyte/demo-js',
    `--repo=${REPO}.git`,
    `--out=${out}`,
    '--source=js',
  ]);
  expect(r.status, r.stderr).toBe(0);
});
afterAll(() => s.cleanup());

describe('js spin-out (--source=js, no CLI)', () => {
  it('contains exactly the product allowlist', () => {
    expect(tree(out)).toEqual(productPaths('js', false));
  });

  it('carries no placeholder and no ts-mode leftovers', () => {
    for (const rel of tree(out)) {
      expect(readFileSync(join(out, rel), 'utf8'), rel).not.toContain('PACKAGE_NAME');
    }
    expect(tree(out)).not.toContain('tsconfig.build.json');
    expect(tree(out)).not.toContain('src/index.ts');
    expect(tree(out)).not.toContain('src/cli.mjs');
  });

  it('has the js publish contract', () => {
    const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('@snackbyte/demo-js');
    expect(pkg.exports).toEqual({ '.': './src/index.mjs', './package.json': './package.json' });
    expect(pkg.bin).toBeUndefined();
    expect(pkg.files).toEqual(['src/', 'README.md', 'LICENSE']);
    expect(pkg.scripts.build).toBeUndefined();
    expect(pkg.scripts.typecheck).toBe('tsc');
    expect(pkg.scripts.prepublishOnly).toBe(
      'npm run check:all && node scripts/check-publish-contract.mjs --exists',
    );
    expect(pkg.devDependencies['typescript-eslint']).toBeUndefined();
    expect(pkg.devDependencies.typescript).toBeDefined();
    // a trailing .git on --repo is normalised, not doubled
    expect(pkg.repository.url).toBe(`git+${REPO}.git`);
  });

  it('README drops the CLI section cleanly', () => {
    const readme = readFileSync(join(out, 'README.md'), 'utf8');
    expect(readme).not.toContain('Command line');
    expect(readme).not.toContain('SPINUP:');
    expect(readme).not.toMatch(/\n{3,}/);
  });

  it(
    'installs, passes its own check:all, and runs from source',
    () => {
      const i = install(out);
      expect(i.status, i.stderr).toBe(0);
      const c = npm(['run', 'check:all'], out);
      expect(c.status, c.stdout + c.stderr).toBe(0);
      const imported = run(
        process.execPath,
        ['-e', 'import("./src/index.mjs").then(m => console.log(m.hello("world")))'],
        out,
      );
      expect(imported.stdout.trim()).toBe('Hello, world!');

      // Phase 1: the pack-and-install smoke test passes in js mode too (no bin here)
      const smoke = npm(['run', 'smoke:pack'], out);
      expect(smoke.status, smoke.stdout + smoke.stderr).toBe(0);
      expect(smoke.stdout).toContain('decoy .env absent');
      expect(smoke.stdout).not.toContain('bin ok');
      expect(exists(join(out, '.env'))).toBe(false);
    },
    SPIN_OUT_TIMEOUT_MS,
  );
});

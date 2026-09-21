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

// The default mode, with a CLI: the spin-out is exactly the allowlist, carries no
// placeholder, has the ts publish contract, and is green on its own gate; the build
// emits dist/ with declarations and both the export and the bin run from it.
// (spec 000 US2/US3, SC-001..003; quickstart §2)

const s = scratch();
const out = join(s.dir, 'demo-ts');
const REPO = 'https://example.com/o/demo-ts';

beforeAll(() => {
  const r = resolver(['--name=demo-ts', `--repo=${REPO}`, `--out=${out}`, '--cli']);
  expect(r.status, r.stderr).toBe(0);
});
afterAll(() => s.cleanup());

describe('ts spin-out (default mode, --cli)', () => {
  it('contains exactly the product allowlist', () => {
    expect(tree(out)).toEqual(productPaths('ts', true));
  });

  it('carries no placeholder', () => {
    for (const rel of tree(out)) {
      expect(readFileSync(join(out, rel), 'utf8'), rel).not.toContain('PACKAGE_NAME');
    }
  });

  it('has the ts publish contract', () => {
    const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('@snackbyte/demo-ts');
    expect(pkg.version).toBe('0.1.0');
    expect(pkg.private).toBeUndefined();
    expect(pkg.type).toBe('module');
    expect(pkg.engines).toEqual({ node: '>=24' });
    expect(pkg.exports).toEqual({
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './package.json': './package.json',
    });
    expect(pkg.bin).toEqual({ 'demo-ts': 'dist/cli.js' });
    expect(pkg.files).toEqual(['dist/', 'README.md', 'LICENSE']);
    expect(pkg.repository).toEqual({ type: 'git', url: `git+${REPO}.git` });
    expect(pkg.homepage).toBe(`${REPO}#readme`);
    expect(pkg.bugs).toEqual({ url: `${REPO}/issues` });
    expect(pkg.scripts.init).toBeUndefined();
    expect(pkg.scripts.build).toBe('tsc -p tsconfig.build.json');
    expect(pkg.scripts.prepublishOnly).toBe('npm run build && npm run check:all');
    expect(pkg.devDependencies['typescript-eslint']).toBeDefined();
  });

  it('README names the package and keeps the CLI section', () => {
    const readme = readFileSync(join(out, 'README.md'), 'utf8');
    expect(readme).toContain('# @snackbyte/demo-ts');
    expect(readme).toContain('npx demo-ts world');
    expect(readme).not.toContain('SPINUP:');
  });

  it(
    'installs, passes its own check:all, builds dist/ with declarations, and runs',
    () => {
      const i = install(out);
      expect(i.status, i.stderr).toBe(0);
      const c = npm(['run', 'check:all'], out);
      expect(c.status, c.stdout + c.stderr).toBe(0);
      const b = npm(['run', 'build'], out);
      expect(b.status, b.stdout + b.stderr).toBe(0);
      for (const f of ['dist/index.js', 'dist/index.d.ts', 'dist/cli.js']) {
        expect(exists(join(out, f)), f).toBe(true);
      }
      const imported = run(
        process.execPath,
        ['-e', 'import("./dist/index.js").then(m => console.log(m.hello("world")))'],
        out,
      );
      expect(imported.stdout.trim()).toBe('Hello, world!');
      const cli = run(process.execPath, ['dist/cli.js', 'world'], out);
      expect(cli.stdout.trim()).toBe('Hello, world!');
    },
    SPIN_OUT_TIMEOUT_MS,
  );
});

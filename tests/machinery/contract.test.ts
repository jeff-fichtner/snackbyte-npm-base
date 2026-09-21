import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_ROOT, resolver, run, scratch } from './helpers.js';

// The publish-contract check (spec 001 FR-006, SC-004): every known-bad shape fails
// naming its field; the template root and both modes' spin-outs pass.

const CHECK = join(TEMPLATE_ROOT, 'scripts/check-publish-contract.mjs');

function check(cwd: string, ...flags: string[]) {
  return run(process.execPath, [CHECK, '--cwd', cwd, ...flags], TEMPLATE_ROOT);
}

/** A correct ts-shaped package.json to mutate. */
function good(): Record<string, unknown> {
  return {
    name: '@snackbyte/good',
    version: '0.1.0',
    type: 'module',
    engines: { node: '>=24' },
    exports: {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './package.json': './package.json',
    },
    bin: { good: 'dist/cli.js' },
    files: ['dist/', 'README.md', 'LICENSE'],
    scripts: { 'check:all': 'true', prepublishOnly: 'npm run build && npm run check:all' },
  };
}

let s: ReturnType<typeof scratch>;
let dir: string;
beforeEach(() => {
  s = scratch();
  dir = join(s.dir, 'pkg');
  mkdirSync(dir);
});
afterEach(() => s.cleanup());

function write(pkg: Record<string, unknown>) {
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
}

describe('check-publish-contract: known-bad shapes fail, naming the field', () => {
  it('passes a correct contract', () => {
    write(good());
    const r = check(dir);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stderr).toBe('');
  });

  const bad: Array<[string, (p: Record<string, unknown>) => void, string]> = [
    ['a "./"-prefixed bin path', (p) => (p.bin = { good: './dist/cli.js' }), 'bin["good"]'],
    ['an absolute bin path', (p) => (p.bin = { good: '/dist/cli.js' }), 'bin["good"]'],
    [
      'exports without ./package.json',
      (p) => (p.exports = { '.': './dist/index.js' }),
      'exports["./package.json"]',
    ],
    [
      'exports without "."',
      (p) => (p.exports = { './package.json': './package.json' }),
      'exports["."]',
    ],
    [
      '"main" instead of exports',
      (p) => {
        delete p.exports;
        p.main = './dist/index.js';
      },
      'exports',
    ],
    ['an engines upper bound', (p) => (p.engines = { node: '>=24 <25' }), 'engines.node'],
    ['no engines', (p) => delete p.engines, 'engines.node'],
    ['type missing', (p) => delete p.type, 'type'],
    ['files missing', (p) => delete p.files, 'files'],
    ['files empty', (p) => (p.files = []), 'files'],
    [
      'prepublishOnly missing',
      (p) => (p.scripts = { 'check:all': 'true' }),
      'scripts.prepublishOnly',
    ],
    [
      'prepublishOnly not running check:all',
      (p) => (p.scripts = { prepublishOnly: 'npm run build' }),
      'scripts.prepublishOnly',
    ],
    ['an unscoped name', (p) => (p.name = 'good'), 'name'],
    ['an uppercase name', (p) => (p.name = '@snackbyte/Good'), 'name'],
  ];
  for (const [label, mutate, field] of bad) {
    it(`fails on ${label}`, () => {
      const p = good();
      mutate(p);
      write(p);
      const r = check(dir);
      expect(r.status).toBe(1);
      expect(r.stderr).toContain(field);
    });
  }

  it('lets a private package keep a placeholder name (the template itself)', () => {
    const p = good();
    p.name = '@snackbyte/PACKAGE_NAME';
    p.private = true;
    write(p);
    expect(check(dir).status).toBe(0);
  });

  it('--exists fails when a files entry or bin path is missing on disk, passes when present', () => {
    write(good());
    expect(check(dir, '--exists').status).toBe(1);
    expect(check(dir, '--exists').stderr).toContain('does not exist on disk');
    mkdirSync(join(dir, 'dist'));
    writeFileSync(join(dir, 'dist/cli.js'), '');
    writeFileSync(join(dir, 'README.md'), '');
    writeFileSync(join(dir, 'LICENSE'), '');
    const r = check(dir, '--exists');
    expect(r.status, r.stderr).toBe(0);
  });
});

describe('check-publish-contract: passes on what the template produces', () => {
  it('passes on the template root', () => {
    const r = check(TEMPLATE_ROOT);
    expect(r.status, r.stderr).toBe(0);
  });

  for (const [mode, flags] of [
    ['ts', ['--cli']],
    ['js', ['--source=js']],
  ] as const) {
    it(`passes on a ${mode} spin-out`, () => {
      const out = join(s.dir, `spin-${mode}`);
      const r = resolver([
        '--name=contract-' + mode,
        '--repo=https://example.com/o/x',
        `--out=${out}`,
        ...flags,
      ]);
      expect(r.status, r.stderr).toBe(0);
      const c = check(out);
      expect(c.status, c.stderr).toBe(0);
      // and the generated contract really is what the check saw
      const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
      expect(pkg.scripts['check:contract']).toBe('node scripts/check-publish-contract.mjs');
      expect(pkg.scripts['check:all']).toContain('check:contract');
      expect(pkg.scripts.prepublishOnly).toContain('--exists');
    });
  }
});

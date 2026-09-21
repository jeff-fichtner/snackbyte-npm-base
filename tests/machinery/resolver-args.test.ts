import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_ROOT, exists, resolver, scratch } from './helpers.js';

// The resolver refuses bad input before writing a byte (spec 000 FR-006/FR-007 and
// quickstart §5). Each case asserts: non-zero exit, the usage line on stderr, and no
// output directory created.

let s: ReturnType<typeof scratch>;
beforeEach(() => {
  s = scratch();
});
afterEach(() => s.cleanup());

const REPO = 'https://example.com/o/pkg';

function expectRefusal(flags: string[], out: string, needle: string) {
  const r = resolver(flags);
  expect(r.status, r.stderr).toBe(1);
  expect(r.stderr).toContain('Usage:');
  expect(r.stderr).toContain(needle);
  expect(exists(out)).toBe(false);
}

describe('resolver argument validation', () => {
  it('refuses without --name', () => {
    const out = join(s.dir, 'pkg');
    expectRefusal([`--repo=${REPO}`, `--out=${out}`], out, '--name is required');
  });

  it('refuses without --repo', () => {
    const out = join(s.dir, 'pkg');
    expectRefusal(['--name=pkg', `--out=${out}`], out, '--repo is required');
  });

  it('refuses without --out', () => {
    const r = resolver(['--name=pkg', `--repo=${REPO}`]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('--out is required');
  });

  it('refuses an unknown --source', () => {
    const out = join(s.dir, 'pkg');
    expectRefusal(
      ['--name=pkg', `--repo=${REPO}`, `--out=${out}`, '--source=py'],
      out,
      '--source must be ts or js',
    );
  });

  it('refuses an unknown flag rather than ignoring it', () => {
    const out = join(s.dir, 'pkg');
    expectRefusal(
      ['--name=pkg', `--repo=${REPO}`, `--out=${out}`, '--souce=js'],
      out,
      'unknown flag --souce',
    );
  });

  it('refuses a --repo that is not an http(s) URL', () => {
    const out = join(s.dir, 'pkg');
    expectRefusal(
      ['--name=pkg', '--repo=example/pkg', `--out=${out}`],
      out,
      'must be an http(s) URL',
    );
  });

  it('refuses an invalid package name', () => {
    const out = join(s.dir, 'pkg');
    expectRefusal(
      ['--name=Not Valid', `--repo=${REPO}`, `--out=${out}`],
      out,
      'not a valid scoped npm package name',
    );
  });

  it('refuses an --out inside the template checkout', () => {
    const out = join(TEMPLATE_ROOT, 'pkg-inside');
    expectRefusal(
      ['--name=pkg', `--repo=${REPO}`, `--out=${out}`],
      out,
      'inside the template checkout',
    );
  });

  it('refuses a non-empty --out', () => {
    const out = join(s.dir, 'pkg');
    mkdirSync(out);
    writeFileSync(join(out, 'something.txt'), 'x');
    const r = resolver(['--name=pkg', `--repo=${REPO}`, `--out=${out}`]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('is not empty');
    expect(exists(join(out, 'package.json'))).toBe(false);
  });

  it('accepts an existing empty --out', () => {
    const out = join(s.dir, 'pkg');
    mkdirSync(out);
    const r = resolver(['--name=pkg', `--repo=${REPO}`, `--out=${out}`]);
    expect(r.status, r.stderr).toBe(0);
    expect(exists(join(out, 'package.json'))).toBe(true);
  });

  it('leaves no staging directory behind', () => {
    const out = join(s.dir, 'pkg');
    const r = resolver(['--name=pkg', `--repo=${REPO}`, `--out=${out}`]);
    expect(r.status, r.stderr).toBe(0);
    expect(readdirSync(s.dir)).toEqual(['pkg']);
  });
});

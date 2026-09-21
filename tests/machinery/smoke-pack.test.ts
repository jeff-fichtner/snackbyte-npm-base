import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPIN_OUT_TIMEOUT_MS, exists, install, npm, resolver, scratch } from './helpers.js';

// smoke:pack's failure path. The first version called process.exit() inside its try
// block, which skipped `finally` and left the planted decoy .env in the working tree
// (found by spec-render's conformance PR, 2026-09-21). A failing run must still clean
// up, and must exit 1 with the reason.

const s = scratch();
afterAll(() => s.cleanup());

describe('smoke:pack on a failing package', () => {
  it(
    'exits 1 naming the problem and removes the decoy .env it planted',
    () => {
      const out = join(s.dir, 'bad-js');
      const r = resolver([
        '--name=bad-js',
        '--repo=https://example.com/o/bad-js',
        `--out=${out}`,
        '--source=js',
      ]);
      expect(r.status, r.stderr).toBe(0);
      const i = install(out);
      expect(i.status, i.stderr).toBe(0);

      // Break the allowlist so the planted .env ships — the exact failure the decoy exists
      // to catch, and one smoke:pack detects after planting it. (npm always includes
      // README/LICENSE regardless of `files`, so those can't be used to force a failure.)
      const pkgPath = join(out, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      pkg.files = ['src/', '.env'];
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

      const smoke = npm(['run', 'smoke:pack'], out);
      expect(smoke.status).toBe(1);
      expect(smoke.stderr).toContain('.env is in the tarball');
      expect(exists(join(out, '.env')), 'decoy .env must be removed on failure').toBe(false);
    },
    SPIN_OUT_TIMEOUT_MS,
  );
});

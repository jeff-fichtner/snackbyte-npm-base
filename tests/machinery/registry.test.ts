import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPIN_OUT_TIMEOUT_MS, exists, install, npm, resolver, scratch } from './helpers.js';

// The local-registry publish round-trip (spec 001 FR-007), run inside a ts spin-out.
// Opt-in: it downloads Verdaccio through npx on first use and binds a port, which is
// too slow and too environment-dependent for every check:all. Run it with
//   SMOKE_REGISTRY=1 npx vitest run tests/machinery/registry.test.ts
// and paste the result into the PR when Phase 1 or the smoke script changes.

const optIn = process.env.SMOKE_REGISTRY === '1';
const s = scratch();
afterAll(() => s.cleanup());

describe.skipIf(!optIn)('smoke:registry in a ts spin-out (SMOKE_REGISTRY=1)', () => {
  it(
    'publishes to a throwaway registry, installs by name, runs, and cleans up',
    () => {
      const out = join(s.dir, 'reg-ts');
      const r = resolver([
        '--name=reg-ts',
        '--repo=https://example.com/o/reg-ts',
        `--out=${out}`,
        '--cli',
      ]);
      expect(r.status, r.stderr).toBe(0);
      const i = install(out);
      expect(i.status, i.stderr).toBe(0);

      // A real package has runtime dependencies; a by-name install from the local
      // registry has to resolve them through the read-only proxy. Give the spin-out one
      // (nanoid: tiny, typed, dependency-free) and make the export use it, so a registry
      // with no uplink — the first version of the script — fails here instead of on
      // the first real graduate.
      const dep = npm(['install', '--save', 'nanoid@5', '--no-audit', '--no-fund'], out);
      expect(dep.status, dep.stderr).toBe(0);
      writeFileSync(
        join(out, 'src/index.ts'),
        [
          "import { nanoid } from 'nanoid';",
          '',
          'export function hello(name: string): string {',
          '  return `Hello, ${name}! (${nanoid(4)})`;',
          '}',
          '',
        ].join('\n'),
      );
      // nanoid ships its own types and has no dependencies, so the strict build passes

      const smoke = npm(['run', 'smoke:registry'], out);
      expect(smoke.status, smoke.stdout + smoke.stderr).toBe(0);
      expect(smoke.stdout).toContain('published @snackbyte/reg-ts@0.1.0 to the local registry');
      expect(smoke.stdout).toContain('installed by name');
      expect(smoke.stdout).toContain('bin ok');
      expect(exists(join(out, '.npmrc'))).toBe(false);
    },
    SPIN_OUT_TIMEOUT_MS,
  );
});

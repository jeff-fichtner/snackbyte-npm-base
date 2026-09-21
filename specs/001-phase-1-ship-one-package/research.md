# Research: Phase 1 — Ship one package to prod, today

## 1. `release.yml`: a `private` gate instead of a `SPINUP:` marker

- **Decision**: the workflow reads `package.json` in a step and gates the publish step
  on `is-env == 'true' && private != 'true'`. The same file serves the template
  (`private: true` → tag, skip publish, say so) and every product (publish).
- **Rationale**: one file, copied verbatim by the resolver, and exercised by this
  repo's own `main` on every merge — a marker-swapped variant would exist only in
  spin-outs and be proven only there. A product accidentally left `private: true`
  skips cleanly with a visible message rather than failing on `npm publish`'s own
  refusal. Spec 000's edge case was made mechanism-neutral for this in PR #1.
- **Alternatives**: the `SPINUP:` marker (two variants of one file; the template's
  never runs the live step); a repo-name condition (hardcodes the owner — rejected).

## 2. OIDC needs npm ≥ 11.5 — upgrade in the job

- **Decision**: the publish job runs `npm install -g npm@latest` after `setup-node`.
- **Rationale**: `setup-node@v5` with Node 24 installs whatever npm that Node release
  bundles; trusted publishing requires 11.5+. Upgrading in the job is the documented
  approach and costs seconds. `@latest` is a moving target by design here — npm's own
  OIDC support is what is being tracked.
- **To re-verify** when the first real graduate publishes through it (spec-render's
  conformance PR): that the publish succeeds with no `NODE_AUTH_TOKEN`, and that the
  provenance attestation appears on the registry.

## 3. Verdaccio via `npx --yes verdaccio@6`, not a devDependency

- **Decision**: `smoke:registry` launches `npx --yes verdaccio@6 --config <tmp>
  --listen <port>` and waits for the port.
- **Rationale**: Verdaccio and its dependency tree are large; every spin-out would pay
  for it on every `npm install` for a script run only before a bootstrap publish.
  `npx` downloads it on first use into the npm cache.
- **Gotchas carried from spec-render's DECISIONS §8**: Verdaccio 6 disables
  self-registration (`max_users` does not re-enable it), so the config sets
  `publish: $anonymous` and `access: $all` on `@snackbyte/*`, and the script writes a
  project-local `.npmrc` with `registry=http://localhost:<port>/` and a dummy
  `//localhost:<port>/:_authToken=` line — git-ignored since Phase 0 — and deletes it
  on exit.

## 4. Two-level contract check

- **Decision**: shape checks always; `--exists` adds on-disk existence of `files`
  entries and `bin` paths. `check:all` runs the shape check; `prepublishOnly` runs
  `--exists` after the build.
- **Rationale**: in `ts` mode `bin` points at `dist/cli.js`, which does not exist until
  the build; a check in `check:all` that demanded it would force a build into the
  typecheck-and-test gate. Existence matters exactly at publish time.

## 5. The upper-bound rule on `engines.node`

- **Decision**: the check refuses any `<` in `engines.node`.
- **Rationale**: constitution v1.1.0 — a library must install on the next Node. Base's
  `>=24 <25` is an app rule. A package that genuinely needs a bound deviates from a
  Principle V default and records why; the check's message says so.

## 6. Machinery: `smoke:pack` in the gate, `smoke:registry` opt-in

- **Decision**: the existing `ts` and `js` round-trip tests also run `npm run
  smoke:pack` inside the spin-out. `smoke:registry` runs inside the `ts` spin-out only
  when `SMOKE_REGISTRY=1`.
- **Rationale**: `smoke:pack` is seconds and needs nothing new; `smoke:registry`
  downloads Verdaccio (tens of seconds cold) and binds a port — too slow and too
  environment-dependent for every `check:all`, but it must be proven, so it is opt-in
  and run by hand for the PR evidence.

## 7. Verified against npm's trusted-publishing docs (2026-09-20)

- The reference GitHub Actions workflow uses `actions/setup-node` **with**
  `registry-url: https://registry.npmjs.org` and no token; npm "automatically detects
  OIDC environments and uses them for authentication before falling back to traditional
  tokens," so a placeholder `NODE_AUTH_TOKEN` does not get in the way. `release.yml`
  matches that shape.
- Minimums: npm CLI ≥ 11.5.1, Node ≥ 22.14. The `npm install -g npm@latest` step covers
  the first; Node 24 the second.
- Provenance is generated automatically **for public repositories publishing public
  packages**. A private repository gets no attestation — recorded in `RELEASING.md`.
- **Verified live, 2026-09-21.** `@snackbyte/spec-render` 0.1.1 published from
  `release.yml` with no token: SLSA v1 provenance naming the workflow and the commit,
  Rekor entry present. The "re-verify on the first real graduate" item is closed.
- Reusable workflows (`workflow_call`): npm validates against the *calling* workflow's
  filename, and `id-token: write` must be granted in both caller and callee. That
  resolves spec 002's "verify at implementation" item in advance: the per-package
  trusted publisher names the thin caller, not the shared workflow.
- `npm stage publish` exists: a staged publish a maintainer approves with 2FA before it
  becomes public. A candidate for Phase 2/3 as a human gate on top of trusted
  publishing; not adopted here.
